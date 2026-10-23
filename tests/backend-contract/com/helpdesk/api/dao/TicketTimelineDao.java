package com.helpdesk.api.dao;
import com.helpdesk.api.model.TicketTimeline;
import java.util.*;
public class TicketTimelineDao {
    public static final List<TicketTimeline> EVENTS = new ArrayList<>();
    public boolean insert(TicketTimeline event) { EVENTS.add(event); return true; }
    public List<TicketTimeline> findByTicketId(int id) { return EVENTS.stream().filter(event -> event.getTicketId() == id).toList(); }
}
