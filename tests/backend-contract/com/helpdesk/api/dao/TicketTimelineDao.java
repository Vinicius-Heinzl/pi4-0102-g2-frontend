package com.helpdesk.api.dao;
import com.helpdesk.api.model.TicketTimeline;
import java.util.*;
public class TicketTimelineDao {
    public boolean insert(TicketTimeline event) { return true; }
    public List<TicketTimeline> findByTicketId(int id) { return List.of(); }
}
