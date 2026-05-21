const express = require('express');
const router = express.Router();

const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand
} = require('@aws-sdk/lib-dynamodb');

const { CognitoIdentityProviderClient, ListUsersCommand } = require('@aws-sdk/client-cognito-identity-provider');
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
const dynamoDB = require('../config/dynamodb');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/roleGuard');


const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const s3 = new S3Client({ region: process.env.AWS_REGION });


const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const sns = new SNSClient({ region: process.env.AWS_REGION });

const { v4: uuidv4 } = require('uuid');

const TASKS_TABLE = 'Tasks';
const COMMENTS_TABLE = 'Comments';
const AUDIT_TABLE = 'AuditLog';


// Task access check
const assertTaskAccess = (task, user) => {

  if (!task) {
    const err = new Error('Task not found');
    err.status = 404;
    throw err;
  }

  // managers bypass team restriction
  if (user.role === 'manager') {
    return;
  }

  // employees only same team
  if (task.teamId !== user.teamId) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }
};

const validPriorities = ['Low', 'Medium', 'High'];

// Create a new task
router.post('/', authenticate, requireRole('manager'), async (req, res, next) => {
  try {
    const {
      title,
      description,
      priority,
      deadline,
      assigneeId,
      imageUrl,
      imageKey
    } = req.body;

    if (!title || !description || !priority || !deadline || !assigneeId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        error: 'Invalid priority (Options: High / Medium / Low)'
      });
    }

    const usersResult = await cognitoClient.send(new ListUsersCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID
    }));

    const assigneeExists = usersResult.Users.find(u =>
      u.Attributes.find(a => a.Name === 'sub')?.Value === assigneeId
    );

    if (!assigneeExists) {
      return res.status(400).json({ error: 'Assignee user not found' });
    }

    const assigneeTeamId = assigneeExists.Attributes.find(
      a => a.Name === 'custom:teamId'
    )?.Value;

    const task = {
      taskId: uuidv4(),
      title,
      description,
      priority,
      deadline,
      assigneeId,
      teamId: assigneeTeamId,
      imageUrl: imageUrl || null,
      imageKey: imageKey || null,
      status: 'To Do',
      createdAt: new Date().toISOString()
    };

    await dynamoDB.send(new PutCommand({
      TableName: TASKS_TABLE,
      Item: task
    }));

    await sns.send(new PublishCommand({
      TopicArn: process.env.SNS_TASK_ASSIGNMENT_TOPIC_ARN,
      Subject: 'New Task Assigned',
      Message: JSON.stringify({
        taskId: task.taskId,
        title: task.title,
        assigneeId: task.assigneeId,
        teamId: task.teamId,
        deadline: task.deadline
      })
    }));

    res.status(201).json(task);

  } catch (err) {
    next(err);
  }
});

// Get tasks for a team
router.get('/', authenticate, async (req, res, next) => {
  try {
    let result;

    if (req.user.role === 'manager') {
      result = await dynamoDB.send(new ScanCommand({
        TableName: TASKS_TABLE
      }));
    }

    else {
      if (!req.user.teamId) {
        return res.status(400).json({ error: "Missing teamId in token" });
      }

      result = await dynamoDB.send(new QueryCommand({
        TableName: TASKS_TABLE,
        IndexName: 'teamId-index',
        KeyConditionExpression: 'teamId = :t',
        ExpressionAttributeValues: {
          ':t': req.user.teamId
        }
      }));
    }

    res.json(result.Items || []);
  } catch (err) {
    next(err);
  }
});

// Get task by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await dynamoDB.send(new GetCommand({
      TableName: TASKS_TABLE,
      Key: { taskId: req.params.id }
    }));

    const task = result.Item;

    assertTaskAccess(task, req.user);

    res.json(task);
  } catch (err) {
    next(err);
  }
});

// Update a task
router.put('/:id', authenticate, requireRole('manager'), async (req, res, next) => {
  try {

    const {
      title,
      description,
      priority,
      deadline,
      assigneeId,
      imageUrl,
      imageKey
    } = req.body;

    if (priority && !validPriorities.includes(priority)) {
        return res.status(400).json({ error: 'Invalid priority (Options: High / Medium / Low)' });
    }

    // get existing task
    const existingTaskResult = await dynamoDB.send(new GetCommand({
      TableName: TASKS_TABLE,
      Key: { taskId: req.params.id }
    }));

    const existingTask = existingTaskResult.Item;

    if (!existingTask) {
      return res.status(404).json({
        error: 'Task not found'
      });
    }

    // validate assignee exists in Cognito
    const usersResult = await cognitoClient.send(new ListUsersCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID
    }));

    const assigneeExists = usersResult.Users.find(u =>
      u.Attributes.find(a => a.Name === 'sub')?.Value === assigneeId
    );

    if (assigneeId !== undefined) {
        const assigneeExists = usersResult.Users.find(u =>
            u.Attributes.find(a => a.Name === 'sub')?.Value === assigneeId
        );

        if (!assigneeExists) {
            return res.status(400).json({ error: 'Assignee user not found' });
        }

        const assigneeTeamId = assigneeExists.Attributes.find(
            a => a.Name === 'custom:teamId'
        )?.Value;

        teamId = assigneeTeamId;
    }

    let UpdateExpression = 'SET updatedAt = :updatedAt';
    let ExpressionAttributeValues = {
        ':updatedAt': new Date().toISOString()
    };

    if (title !== undefined) {
        UpdateExpression += ', title = :title';
        ExpressionAttributeValues[':title'] = title;
    }

    if (description !== undefined) {
        UpdateExpression += ', description = :description';
        ExpressionAttributeValues[':description'] = description;
    }

    if (priority !== undefined && !validPriorities.includes(priority)) {
        return res.status(400).json({
            error: 'Invalid priority (Options: High / Medium / Low)'
        });
    }

    if (deadline !== undefined) {
        UpdateExpression += ', deadline = :deadline';
        ExpressionAttributeValues[':deadline'] = deadline;
    }

    if (assigneeId !== undefined) {
        UpdateExpression += ', assigneeId = :assigneeId';
        ExpressionAttributeValues[':assigneeId'] = assigneeId;
    }

    if (imageUrl !== undefined) {
        UpdateExpression += ', imageUrl = :imageUrl';
        ExpressionAttributeValues[':imageUrl'] = imageUrl;
    }

    if (imageKey !== undefined) {
        UpdateExpression += ', imageKey = :imageKey';
        ExpressionAttributeValues[':imageKey'] = imageKey;
    }

    if (teamId !== undefined) {
        UpdateExpression += ', teamId = :teamId';
        ExpressionAttributeValues[':teamId'] = teamId;
    }

    // update task
    await dynamoDB.send(new UpdateCommand({
        TableName: TASKS_TABLE,
        Key: { taskId: req.params.id },
        UpdateExpression,
        ExpressionAttributeValues
    }));

    // publish SNS event if assignee changed
    if (existingTask.assigneeId !== assigneeId) {

      await sns.send(new PublishCommand({
        TopicArn: process.env.SNS_TASK_ASSIGNMENT_TOPIC_ARN,
        Subject: 'Task Reassigned',
        Message: JSON.stringify({
            taskId: req.params.id,
            title: title ?? existingTask.title,
            assigneeId,
            teamId: teamId ?? existingTask.teamId,
            deadline: deadline ?? existingTask.deadline
        })
      }));
    }

    res.json({
      message: 'Task updated'
    });

  } catch (err) {
    next(err);
  }
});

// Delete a task
router.delete('/:id', authenticate, requireRole('manager'), async (req, res, next) => {
  try {
    const result = await dynamoDB.send(new GetCommand({
      TableName: TASKS_TABLE,
      Key: { taskId: req.params.id }
    }));

    const task = result.Item;
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Delete image from S3 if it exists
    if (task.imageKey) {
      await s3.send(new DeleteObjectCommand({
        Bucket: process.env.S3_ORIGINALS_BUCKET,
        Key: task.imageKey
      }));
    }

    await dynamoDB.send(new DeleteCommand({
      TableName: TASKS_TABLE,
      Key: { taskId: req.params.id }
    }));

    res.json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
});

// Status flow updating and audit logging
const allowedTransitions = {
  'To Do': 'In Progress',
  'In Progress': 'In Review',
  'In Review': 'Done'
};

router.put('/:id/status', authenticate, async (req, res, next) => {
  try {
    const { newStatus } = req.body;

    const result = await dynamoDB.send(new GetCommand({
      TableName: TASKS_TABLE,
      Key: { taskId: req.params.id }
    }));

    const task = result.Item;
    if (!task) return res.status(404).json({ error: 'Task not found' });

    assertTaskAccess(task, req.user);

    if (allowedTransitions[task.status] !== newStatus) {
      return res.status(400).json({
        error: `Invalid transition: ${task.status} → ${newStatus}`
      });
    }

    await dynamoDB.send(new UpdateCommand({
      TableName: TASKS_TABLE,
      Key: { taskId: req.params.id },
      UpdateExpression: 'SET #s = :s',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':s': newStatus }
    }));

    // logging the status change
    await dynamoDB.send(new PutCommand({
        TableName: AUDIT_TABLE,
        Item: {
            taskId: req.params.id,
            timestamp: new Date().toISOString(),
            changedBy: req.user.userId,
            fromStatus: task.status,
            toStatus: newStatus
        }
    }));

    res.json({ message: 'Status updated' });
  } catch (err) {
    next(err);
  }
});

// Get audit log for a task
router.get('/:id/audit', authenticate, async (req, res, next) => {
  try {
    const taskResult = await dynamoDB.send(new GetCommand({
      TableName: TASKS_TABLE,
      Key: { taskId: req.params.id }
    }));

    assertTaskAccess(taskResult.Item, req.user);

    const logs = await dynamoDB.send(new QueryCommand({
        TableName: AUDIT_TABLE,
        KeyConditionExpression: 'taskId = :t',
        ExpressionAttributeValues: {
            ':t': req.params.id
        }
    }));

    res.json(logs.Items);
  } catch (err) {
    next(err);
  }
});

// Add comment to a task
router.post('/:id/comments', authenticate, async (req, res, next) => {
  try {
    const taskResult = await dynamoDB.send(new GetCommand({
      TableName: TASKS_TABLE,
      Key: { taskId: req.params.id }
    }));

    const task = taskResult.Item;

    assertTaskAccess(task, req.user);

    if (!req.body.text) {
    return res.status(400).json({
        error: 'Comment text required'
    });
}

    const comment = {
      commentId: uuidv4(),
      taskId: req.params.id,
      userId: req.user.userId,
      text: req.body.text,
      createdAt: new Date().toISOString()
    };

    await dynamoDB.send(new PutCommand({
      TableName: COMMENTS_TABLE,
      Item: comment
    }));

    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
});

// Get comments for a task
router.get('/:id/comments', authenticate, async (req, res, next) => {
  try {
    const taskResult = await dynamoDB.send(new GetCommand({
      TableName: TASKS_TABLE,
      Key: {
        taskId: req.params.id
      }
    }));

    const task = taskResult.Item;

    if (!task) {
      return res.status(404).json({
        error: 'Task not found'
      });
    }

    assertTaskAccess(taskResult.Item, req.user);

    const commentsResult = await dynamoDB.send(new ScanCommand({
      TableName: COMMENTS_TABLE,
      FilterExpression: 'taskId = :t',
      ExpressionAttributeValues: {
        ':t': req.params.id
      }
    }));

    res.json(commentsResult.Items || []);

  } catch (err) {
    next(err);
  }
});

module.exports = router;