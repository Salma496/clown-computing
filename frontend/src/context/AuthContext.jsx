import { createContext, useContext, useState, useEffect } from 'react';
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
};

const userPool = new CognitoUserPool(poolData);

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
      cognitoUser.getSession((err, session) => {
        if (!err && session.isValid()) {
          const payload = session.getIdToken().decodePayload();
          localStorage.setItem('idToken', session.getIdToken().getJwtToken());
          setUser({
            userId: payload.sub,
            email: payload.email,
            role: payload['custom:role'],
            teamId: payload['custom:teamId'],
            name: payload.name || payload.email,
          });
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const login = (email, password) =>
    new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
      const authDetails = new AuthenticationDetails({ Username: email, Password: password });
      cognitoUser.authenticateUser(authDetails, {
        onSuccess(session) {
          const payload = session.getIdToken().decodePayload();
          localStorage.setItem('idToken', session.getIdToken().getJwtToken());
          const u = {
            userId: payload.sub,
            email: payload.email,
            role: payload['custom:role'],
            teamId: payload['custom:teamId'],
            name: payload.name || payload.email,
          };
          setUser(u);
          resolve(u);
        },
        onFailure: reject,
        newPasswordRequired(userAttributes) {
          resolve({ requiresNewPassword: true, cognitoUser, userAttributes });
        },
      });
    });

  const completeNewPassword = (cognitoUser, newPassword) =>
    new Promise((resolve, reject) => {
      cognitoUser.completeNewPasswordChallenge(newPassword, {}, {
        onSuccess(session) {
          const payload = session.getIdToken().decodePayload();
          localStorage.setItem('idToken', session.getIdToken().getJwtToken());
          const u = {
            userId: payload.sub,
            email: payload.email,
            role: payload['custom:role'],
            teamId: payload['custom:teamId'],
            name: payload.name || payload.email,
          };
          setUser(u);
          resolve(u);
        },
        onFailure: reject,
      });
    });

  const signup = (email, password, name, role, teamId) =>
    new Promise((resolve, reject) => {
      const attributes = [
        new CognitoUserAttribute({ Name: 'email', Value: email }),
        new CognitoUserAttribute({ Name: 'name', Value: name }),
        new CognitoUserAttribute({ Name: 'custom:role', Value: role }),
        new CognitoUserAttribute({ Name: 'custom:teamId', Value: teamId || '' }),
      ];
      userPool.signUp(email, password, attributes, null, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

  const logout = () => {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) cognitoUser.signOut();
    localStorage.removeItem('idToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, completeNewPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
