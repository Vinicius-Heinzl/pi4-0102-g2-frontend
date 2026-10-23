package com.helpdesk.api.dao;
import com.helpdesk.api.model.Ticket;
import java.util.*;
public class TicketDao {
    public static Ticket saved;
    public static int updates;
    public static int deletes;
    public Ticket insert(Ticket ticket) { saved = ticket; saved.setId(42); return saved; }
    public Ticket findById(int id) { return id == 42 ? saved : null; }
    public List<Ticket> findAll(String status, Integer clientId, Integer supportId) { return saved == null ? List.of() : List.of(saved); }
    public boolean update(Ticket ticket) { saved = ticket; updates++; return true; }
    public boolean deleteById(int id) { deletes++; return true; }
}
