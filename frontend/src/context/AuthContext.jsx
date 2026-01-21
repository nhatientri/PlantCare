import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('plantcare_token'));
    const [user, setUser] = useState(null);

    useEffect(() => {
        if (token) {
            localStorage.setItem('plantcare_token', token);
            try {
                // Decode token to get user info
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUser({ username: payload.username, id: payload.id });
            } catch (e) {
                console.error("Failed to decode token", e);
                setUser(null);
            }
        } else {
            localStorage.removeItem('plantcare_token');
            setUser(null);
        }
    }, [token]);

    const login = (newToken) => {
        setToken(newToken);
    };

    const logout = () => {
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{ token, isAuthenticated: !!token, user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
