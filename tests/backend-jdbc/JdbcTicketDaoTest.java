import com.helpdesk.api.config.Database;
import com.helpdesk.api.dao.TicketDao;
import com.helpdesk.api.model.Ticket;
import java.sql.SQLException;

public class JdbcTicketDaoTest {
    public static void main(String[] args) throws Exception {
        Ticket ticket = new Ticket();
        ticket.setId(22); ticket.setTitle("Acesso"); ticket.setDescription("Detalhes");
        ticket.setPriority("URGENT"); ticket.setCategoryId(1); ticket.setClientId(1);
        ticket.setSupportId(7); ticket.setStatus("NEW");
        TicketDao dao = new TicketDao();
        dao.insert(ticket);
        if (!"NEW".equals(Database.parameters.get(7))) throw new AssertionError("Production insert must not derive ASSIGNED from a nominated assignee");
        ticket.setStatus("CLOSED");
        if (!dao.update(ticket)) throw new AssertionError("Valid update should succeed");
        if (!"CLOSED".equals(Database.parameters.get(5)) || !"CLOSED".equals(Database.parameters.get(7))) throw new AssertionError("Resolution must bind both status and closed_at condition");
        Database.failUpdate = true;
        boolean propagated = false;
        try { dao.update(ticket); } catch (Exception error) { propagated = error instanceof SQLException; }
        if (!propagated) throw new AssertionError("Database failures must propagate, not masquerade as ticket-not-found");
        System.out.println("PASS production JDBC checks (parameter binding and error propagation; no database access)");
    }
}
