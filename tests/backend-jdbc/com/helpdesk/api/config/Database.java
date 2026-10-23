package com.helpdesk.api.config;

import java.lang.reflect.Proxy;
import java.sql.*;
import java.util.*;

/** JDBC boundary stub: exercises the production DAO without network or database writes. */
public class Database {
    public static final Map<Integer, Object> parameters = new HashMap<>();
    public static boolean failUpdate;
    public static String sql;

    public static Connection getConnection() {
        return (Connection) Proxy.newProxyInstance(Database.class.getClassLoader(), new Class<?>[]{Connection.class}, (proxy, method, args) -> {
            if (method.getName().equals("close")) return null;
            if (!method.getName().equals("prepareStatement")) throw new UnsupportedOperationException(method.getName());
            sql = (String) args[0]; parameters.clear();
            return Proxy.newProxyInstance(Database.class.getClassLoader(), new Class<?>[]{PreparedStatement.class}, (statement, operation, values) -> {
                String name = operation.getName();
                if (name.equals("close")) return null;
                if (name.equals("setString") || name.equals("setInt") || name.equals("setNull")) {
                    parameters.put((Integer) values[0], name.equals("setNull") ? null : values[1]);
                    return null;
                }
                if (name.equals("executeUpdate")) {
                    if (failUpdate) throw new SQLException("Simulated database failure", "08006");
                    return 1;
                }
                if (name.equals("executeQuery")) return Proxy.newProxyInstance(Database.class.getClassLoader(), new Class<?>[]{ResultSet.class}, (result, read, arguments) -> {
                    if (read.getName().equals("next")) return false;
                    if (read.getName().equals("close")) return null;
                    throw new UnsupportedOperationException(read.getName());
                });
                throw new UnsupportedOperationException(name);
            });
        });
    }

    public static void releaseConnection(Connection connection) {}
}
