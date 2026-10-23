package com.helpdesk.api.dao;
import com.helpdesk.api.model.Ticket;
import java.util.*;
public class TicketDao {
    public static Ticket saved;
    public static int updates;
    public static int deletes;
    public static int starts;
    public static boolean failUpdate;
    public Ticket insert(Ticket ticket) { saved = ticket; saved.setId(42); return saved; }
    public Ticket findById(int id) { return id == 42 ? saved : null; }
    public List<Ticket> findAll(String status, Integer clientId, Integer supportId) { return saved == null ? List.of() : List.of(saved); }
    public boolean update(Ticket ticket) throws java.sql.SQLException {
        if (failUpdate) throw new java.sql.SQLException("Simulated database failure", "08006");
        saved = ticket; updates++; return true;
    }
    public boolean startService(int id, int technicianId, String message) {
        synchronized (TicketDao.class) {
            if (saved == null || saved.getId() != id || !"NEW".equals(saved.getStatus())) return false;
            saved.setStatus("ASSIGNED"); saved.setSupportId(technicianId); starts++;
            com.helpdesk.api.model.TicketTimeline event = new com.helpdesk.api.model.TicketTimeline();
            event.setTicketId(id); event.setAuthorId(technicianId); event.setMessage(message); event.setEventType("STATUS_CHANGE");
            new TicketTimelineDao().insert(event);
            return true;
        }
    }
    public boolean deleteById(int id) { deletes++; return true; }
}
