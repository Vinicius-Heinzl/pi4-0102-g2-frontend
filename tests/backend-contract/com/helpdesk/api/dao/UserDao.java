package com.helpdesk.api.dao;
import com.helpdesk.api.model.User;
import java.util.*;
public class UserDao {
    public static final Map<Integer, User> USERS = new HashMap<>();
    public static User registered;
    public User findById(int id) { return USERS.get(id); }
    public User findByEmail(String email) { return null; }
    public List<User> findAll() { return new ArrayList<>(USERS.values()); }
    public User insert(User user, String password) { registered = user; user.setId(100); return user; }
}
