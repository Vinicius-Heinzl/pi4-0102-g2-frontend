package com.helpdesk.api.dao;
import com.helpdesk.api.model.Notification;
import java.util.*;
public class NotificationDao {
    public static final List<Notification> NOTIFICATIONS = new ArrayList<>();
    public List<Notification> findByUserId(int id) { return new ArrayList<>(NOTIFICATIONS); }
    public boolean markAsRead(int id, int userId) { return true; }
}
