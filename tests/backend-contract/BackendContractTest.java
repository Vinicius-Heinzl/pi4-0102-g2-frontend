import com.helpdesk.api.dao.*;
import com.helpdesk.api.handler.*;
import com.helpdesk.api.model.*;
import com.helpdesk.api.util.*;
import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.net.http.*;

public class BackendContractTest {
    static String base;
    static final HttpClient client = HttpClient.newHttpClient();
    static int checks;
    static void check(boolean value, String message) {
        if (!value) throw new AssertionError(message);
        checks++;
    }
    static HttpResponse<String> call(int actor, String method, String path, String body) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create(base + path))
            .header("Authorization", "Bearer " + AuthUtil.generateToken(actor))
            .header("Content-Type", "application/json");
        return client.send(request.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
    }
    static void user(int id, String role, String department) {
        User user = new User(); user.setId(id); user.setName("User " + id); user.setRole(role); user.setDepartment(department);
        UserDao.USERS.put(id, user);
    }
    public static void main(String[] args) throws Exception {
        user(1, "ADMIN", "Financeiro"); user(2, "CLIENT", "TI"); user(3, "SUPPORT", "Marketing");
        user(4, "CLIENT", "Financeiro"); user(5, "ADMIN", "Vendas"); user(6, "ADMIN", null);
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/api/chamados", new TicketHandler());
        server.createContext("/api/register", new UserHandler());
        server.createContext("/api/notificacoes", new NotificationHandler());
        server.start(); base = "http://127.0.0.1:" + server.getAddress().getPort();
        try {
            String create = "{\"title\":\"Teste\",\"description\":\"Detalhes\",\"priority\":\"HIGH\",\"categoryId\":1,\"supportId\":3}";
            check(call(1, "POST", "/api/chamados", create).statusCode() == 201, "Non-TI must create and assign to Marketing");
            check(TicketDao.saved.getSupportId() == 3 && TicketDao.saved.getStatus().equals("ASSIGNED"), "Creation must persist any-sector assignee and derived status");
            check(TicketDao.saved.getClientId() == 1, "Requester must come from token");
            check(call(4, "GET", "/api/chamados/42", null).statusCode() == 200, "Coworker in requester sector can read details");
            check(call(3, "GET", "/api/chamados/42", null).statusCode() == 200, "Assigned sector can read details");
            check(call(5, "GET", "/api/chamados/42", null).statusCode() == 404, "Unrelated ADMIN cannot read details or timeline");
            check(call(6, "GET", "/api/chamados/42", null).statusCode() == 404, "Missing department grants no access");
            check(call(2, "GET", "/api/chamados/42", null).statusCode() == 200, "TI can read every ticket");
            check(call(4, "GET", "/api/chamados", null).body().contains("\"id\":42"), "Coworker list includes sector requests");
            check(call(3, "GET", "/api/chamados", null).body().contains("\"id\":42"), "Assigned sector list includes requests");
            check(call(5, "GET", "/api/chamados?clientId=1&supportId=3", null).body().equals("[]"), "Submitted filters cannot bypass department restriction");
            check(call(6, "GET", "/api/chamados", null).body().equals("[]"), "Unknown sector has an empty list");
            Notification notification = new Notification(); notification.setId(1); notification.setTicketId(42);
            NotificationDao.NOTIFICATIONS.add(notification);
            check(call(4, "GET", "/api/notificacoes", null).body().contains("\"ticketId\":42"), "Visible notifications retained");
            check(call(5, "GET", "/api/notificacoes", null).body().equals("[]"), "Notifications never expose unrelated tickets");
            UserDao.USERS.get(4).setDepartment("Compras");
            check(call(4, "GET", "/api/chamados/42", null).statusCode() == 404, "Department changes apply immediately from database profile");
            check(call(1, "PUT", "/api/chamados/42", "{\"status\":\"CLOSED\",\"message\":\"Teste\"}").statusCode() == 403, "Admin outside TI must not edit");
            check(call(3, "DELETE", "/api/chamados/42", null).statusCode() == 403, "Support outside TI must not delete");
            check(TicketDao.updates == 0 && TicketDao.deletes == 0, "Denied operations must not write");
            check(call(2, "PUT", "/api/chamados/42", "{\"status\":\"CLOSED\",\"title\":\"Editado\",\"message\":\"Resolvido\"}").statusCode() == 200, "TI client must edit");
            check(TicketDao.saved.getSupportId() == 3 && TicketDao.saved.getTitle().equals("Editado"), "Status-only update preserves assignee; details update persists");
            check(call(2, "PUT", "/api/chamados/42", "{\"status\":\"INVALID\",\"message\":\"Teste\"}").statusCode() == 400, "Invalid enum must be rejected");
            check(call(2, "PUT", "/api/chamados/42", "{\"status\":\"NEW\",\"message\":\"Reabrir\"}").statusCode() == 200, "TI may reopen");
            check(TicketDao.saved.getSupportId() == null, "Reopen clears assignee");
            check(call(2, "PUT", "/api/chamados/42", "{\"status\":\"ASSIGNED\",\"message\":\"Teste\"}").statusCode() == 400, "In progress requires an assignee");
            check(call(1, "POST", "/api/chamados", create.replace("\"supportId\":3", "\"supportId\":999")).statusCode() == 400, "Unknown assignee rejected");
            check(call(1, "POST", "/api/chamados", create.replace(",\"supportId\":3", "")).statusCode() == 201, "Unassigned creation remains supported");
            check(TicketDao.saved.getStatus().equals("NEW"), "Unassigned starts NEW");
            String register = "{\"name\":\"Nova pessoa\",\"email\":\"test@example.com\",\"password\":\"local-test\",\"role\":\"ADMIN\",\"department\":\"TI\"}";
            check(call(1, "POST", "/api/register", register).statusCode() == 201, "Valid department registration");
            check(UserDao.registered.getRole().equals("CLIENT"), "Public registration must not grant ADMIN");
            check(call(1, "POST", "/api/register", register.replace("\"department\":\"TI\"", "\"department\":\"Unknown\"")).statusCode() == 400, "Invalid registration sector rejected");
            check(call(2, "DELETE", "/api/chamados/42", null).statusCode() == 200, "TI may delete");
            System.out.println("PASS " + checks + " backend contract checks (isolated in-memory DAOs, no database access)");
        } finally { server.stop(0); }
    }
}
