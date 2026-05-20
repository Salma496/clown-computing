const express = require('express');
const router = express.Router();
const { PutCommand, ScanCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const dynamoDB = require('../config/dynamodb');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/roleGuard');
const { v4: uuidv4 } = require('uuid');

const TABLE = 'Projects';

router.post('/', authenticate, requireRole('manager'), async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const project = {
      projectId: uuidv4(),
      name,
      description,
      managerId: req.user.userId,
      createdAt: new Date().toISOString(),
    };
    await dynamoDB.send(new PutCommand({ TableName: TABLE, Item: project }));
    res.status(201).json(project);
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
    const { name, description } = req.body;
    await dynamoDB.send(new UpdateCommand({
      TableName: TABLE,
      Key: { projectId: req.params.id },
      UpdateExpression: 'SET #n = :name, description = :desc',
      ExpressionAttributeNames: { '#n': 'name' },
      ExpressionAttributeValues: { ':name': name, ':desc': description },
    }));
    res.json({ projectId: req.params.id, name, description });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, requireRole('manager'), async (req, res, next) => {
  try {
    await dynamoDB.send(new DeleteCommand({ TableName: TABLE, Key: { projectId: req.params.id } }));
    res.json({ message: 'Project deleted' });
  } catch (err) { next(err); }
});

module.exports = router;