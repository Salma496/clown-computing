const express = require('express');
const router = express.Router();
const { CognitoIdentityProviderClient, AdminCreateUserCommand, ListUsersCommand } = require('@aws-sdk/client-cognito-identity-provider');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/roleGuard');

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

router.get('/', authenticate, requireRole('manager'), async (req, res, next) => {
  try {
    const result = await cognitoClient.send(new ListUsersCommand({ UserPoolId: USER_POOL_ID }));
    const users = result.Users.map(u => ({
      username: u.Username,
      email: u.Attributes.find(a => a.Name === 'email')?.Value,
      role: u.Attributes.find(a => a.Name === 'custom:role')?.Value,
      teamId: u.Attributes.find(a => a.Name === 'custom:teamId')?.Value,
    }));
    res.json(users);
  } catch (err) { next(err); }
});

router.post('/', authenticate, requireRole('manager'), async (req, res, next) => {
  try {
    const { email, name, role, teamId, temporaryPassword } = req.body;
    await cognitoClient.send(new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      TemporaryPassword: temporaryPassword || 'Temp@1234',
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'name', Value: name },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'custom:role', Value: role },
        { Name: 'custom:teamId', Value: teamId || '' },
      ],
    }));
    res.status(201).json({ message: 'User created in Cognito', email });
  } catch (err) { next(err); }
});

module.exports = router;