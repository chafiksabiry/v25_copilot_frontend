# HARX REPS AI Copilot - API Documentation

## Base URL
```
Production: https://your-domain.com/api
Development: http://localhost:5000/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Response Format

All API responses follow this format:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Success message",
  "data": {}, // Response data
  "errors": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Authentication Endpoints

### POST /auth/register
Register a new user.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "agent"
}
```

**Response:**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "agent"
    },
    "token": "jwt_token"
  }
}
```

### POST /auth/login
Authenticate user and get access token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "agent"
    },
    "token": "jwt_token"
  }
}
```

### GET /auth/me
Get current user information.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "agent",
    "profile": {
      "avatar": "avatar_url",
      "phone": "+1234567890"
    }
  }
}
```

## Contact Endpoints

### GET /contacts
Get all contacts with filtering and pagination.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `status` (string): Filter by status
- `priority` (string): Filter by priority
- `search` (string): Search in name, email, company
- `sortBy` (string): Sort field (default: createdAt)
- `sortOrder` (string): asc or desc (default: desc)

**Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Contacts retrieved successfully",
  "data": {
    "contacts": [
      {
        "id": "contact_id",
        "name": "Jane Smith",
        "email": "jane@company.com",
        "phone": "+1234567890",
        "company": "Tech Corp",
        "status": "qualified",
        "priority": "high",
        "leadScore": 85
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalContacts": 50,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### POST /contacts
Create a new contact.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@company.com",
  "phone": "+1234567890",
  "company": "Tech Corp",
  "title": "CTO",
  "status": "new",
  "priority": "medium",
  "tags": ["enterprise", "tech"],
  "notes": "Interested in our enterprise solution"
}
```

**Response:**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Contact created successfully",
  "data": {
    "id": "contact_id",
    "name": "Jane Smith",
    "email": "jane@company.com",
    // ... other contact fields
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /contacts/:id
Get contact by ID.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Contact retrieved successfully",
  "data": {
    "id": "contact_id",
    "name": "Jane Smith",
    // ... all contact fields
  }
}
```

### PUT /contacts/:id
Update contact.

**Headers:** `Authorization: Bearer <token>`

**Request Body:** (partial update)
```json
{
  "status": "qualified",
  "leadScore": 90,
  "notes": "Updated notes"
}
```

### DELETE /contacts/:id
Delete contact.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Contact deleted successfully",
  "data": null
}
```

## Call Endpoints

### GET /calls
Get all calls with filtering.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `status` (string): active, completed, cancelled
- `outcome` (string): sale, appointment, callback, etc.
- `startDate` (string): ISO date string
- `endDate` (string): ISO date string

**Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Calls retrieved successfully",
  "data": {
    "calls": [
      {
        "id": "call_id",
        "contactId": "contact_id",
        "agentId": "agent_id",
        "startTime": "2024-01-01T10:00:00.000Z",
        "endTime": "2024-01-01T10:30:00.000Z",
        "duration": 1800000,
        "status": "completed",
        "outcome": "sale",
        "metrics": {
          "clarity": 85,
          "empathy": 90,
          "assertiveness": 80,
          "efficiency": 88,
          "overallScore": 85.75
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalCalls": 25,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### POST /calls
Start a new call.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "contactId": "contact_id",
  "callType": "outbound",
  "methodology": "reps-flow"
}
```

**Response:**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Call started successfully",
  "data": {
    "id": "call_id",
    "contactId": "contact_id",
    "agentId": "agent_id",
    "startTime": "2024-01-01T10:00:00.000Z",
    "status": "active",
    "callType": "outbound",
    "methodology": "reps-flow"
  }
}
```

### PUT /calls/:id/end
End a call.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "outcome": "sale",
  "notes": "Successful sale of enterprise package"
}
```

**Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Call ended successfully",
  "data": {
    "call": {
      "id": "call_id",
      "endTime": "2024-01-01T10:30:00.000Z",
      "duration": 1800000,
      "status": "completed",
      "outcome": "sale"
    },
    "insights": {
      "personalityType": "D",
      "recommendations": ["Follow up within 24 hours"],
      "keyMoments": ["Customer expressed urgency at 15:30"]
    }
  }
}
```

### PUT /calls/:id/metrics
Update call metrics.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "clarity": 85,
  "empathy": 90,
  "assertiveness": 80,
  "efficiency": 88
}
```

### GET /calls/:id/transcripts
Get call transcripts.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Call transcripts retrieved successfully",
  "data": [
    {
      "id": "transcript_id",
      "participantId": "agent_id",
      "participantRole": "agent",
      "text": "Hello, thank you for taking my call today.",
      "timestamp": "2024-01-01T10:00:30.000Z",
      "confidence": 0.95,
      "sentiment": "positive"
    }
  ]
}
```

## Analytics Endpoints

### GET /calls/analytics/summary
Get call analytics summary.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `startDate` (string): ISO date string
- `endDate` (string): ISO date string
- `agentId` (string): Filter by agent

**Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Call analytics retrieved successfully",
  "data": {
    "totalCalls": 150,
    "completedCalls": 142,
    "completionRate": 94.67,
    "avgDuration": 1650000,
    "avgOverallScore": 82.5,
    "outcomeBreakdown": {
      "sale": 45,
      "appointment": 38,
      "callback": 25,
      "not_interested": 34
    }
  }
}
```

## Real-time Events (Socket.io)

### Connection
```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

### Events

#### Client to Server
- `join-call` - Join a call room
- `leave-call` - Leave a call room
- `transcript-update` - Send transcript update
- `audio-level` - Send audio level data

#### Server to Client
- `call-started` - Call has started
- `call-ended` - Call has ended
- `transcript-update` - New transcript entry
- `audio-level` - Audio level update
- `metrics-updated` - Call metrics updated
- `phase-updated` - Call phase changed
- `new-recommendation` - New AI recommendation

### Example Usage
```javascript
// Join a call
socket.emit('join-call', 'call_id');

// Listen for transcript updates
socket.on('transcript-update', (data) => {
  console.log('New transcript:', data);
});

// Send audio level
socket.emit('audio-level', {
  callId: 'call_id',
  level: 75
});
```

## Error Codes

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## Rate Limiting

- 100 requests per 15 minutes per IP
- Authentication endpoints: 5 requests per 15 minutes per IP
- File upload endpoints: 10 requests per hour per user

## Pagination

All list endpoints support pagination:
- `page`: Page number (starts from 1)
- `limit`: Items per page (max 100)
- Response includes pagination metadata

## Filtering and Sorting

Most list endpoints support:
- Filtering by status, priority, dates
- Text search across relevant fields
- Sorting by any field (asc/desc)
- Multiple filter combinations

This API documentation provides comprehensive coverage of all available endpoints and their usage patterns.