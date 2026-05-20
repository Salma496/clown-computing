const express = require('express');
const router = express.Router();
const { PutCommand, ScanCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const dynamoDB = require('../config/dynamodb');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/roleGuard');
const { v4: uuidv4 } = require('uuid');

const TABLE = 'Teams';

router.post('/', authenticate, requireRole('manager'), async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const team = { teamId: uuidv4(), name, createdAt: new Date().toISOString() };
    await dynamoDB.send(new PutCommand({ TableName: TABLE, Item: team }));
    res.status(201).json(team);
  } catch (err) { next(err); }
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await dynamoDB.send(new ScanCommand({ TableName: TABLE }));
    res.json(result.Items);
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, requireRole('manager'), async (req, res, next) => {
  try {
    const { name } = req.body;
    await dynamoDB.send(new UpdateCommand({
      TableName: TABLE,
      Key: { teamId: req.params.id },
      UpdateExpression: 'SET #n = :name',
      ExpressionAttributeNames: { '#n': 'name' },
      ExpressionAttributeValues: { ':name': name },
    }));
    res.json({ teamId: req.params.id, name });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, requireRole('manager'), async (req, res, next) => {
  try {
    await dynamoDB.send(new DeleteCommand({ TableName: TABLE, Key: { teamId: req.params.id } }));
    res.json({ message: 'Team deleted' });
  } catch (err) { next(err); }
});

module.exports = router;