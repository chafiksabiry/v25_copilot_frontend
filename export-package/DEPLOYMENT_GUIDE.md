# HARX REPS AI Copilot - Deployment Guide

## Quick Start Guide

### 1. Prerequisites
- Node.js 18 or higher
- MongoDB 6 or higher
- Git

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret_key
FRONTEND_URL=your_frontend_url
```

Start the backend:
```bash
npm start
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `.env` file:
```env
VITE_API_URL=your_backend_api_url
VITE_SOCKET_URL=your_backend_socket_url
```

Build and serve:
```bash
npm run build
npm run preview
```

### 4. Database Setup

1. Create MongoDB database
2. The application will auto-create collections
3. Create initial admin user via API or MongoDB directly

### 5. Production Deployment

#### Backend (Node.js)
- Deploy to AWS EC2, Heroku, or DigitalOcean
- Use PM2 for process management
- Set up reverse proxy with Nginx
- Configure SSL certificates

#### Frontend (React)
- Deploy to Netlify, Vercel, or AWS S3
- Configure environment variables
- Set up custom domain

#### Database (MongoDB)
- Use MongoDB Atlas for managed hosting
- Or deploy on dedicated server
- Configure backups and monitoring

## Environment Variables

### Backend (.env)
```env
# Server
PORT=5000
NODE_ENV=production

# Database
MONGODB_URI=mongodb://localhost:27017/harx_reps_db

# Authentication
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# CORS
FRONTEND_URL=https://your-frontend-domain.com

# External APIs (Optional)
OPENAI_API_KEY=your_openai_key
SPEECH_API_URL=your_speech_service_url
SPEECH_API_KEY=your_speech_service_key
```

### Frontend (.env)
```env
# API Configuration
VITE_API_URL=https://your-backend-domain.com/api
VITE_SOCKET_URL=https://your-backend-domain.com

# External Services (Optional)
VITE_OPENAI_API_KEY=your_openai_key
VITE_WEBRTC_STUN_SERVER=stun:stun.l.google.com:19302
```

## Security Checklist

- [ ] Change default JWT secret
- [ ] Use HTTPS in production
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable MongoDB authentication
- [ ] Use environment variables for secrets
- [ ] Set up monitoring and logging

## Monitoring & Maintenance

### Health Checks
- Backend: `GET /health`
- Monitor database connections
- Check real-time socket connections

### Logging
- Application logs via Morgan
- Error tracking with Sentry (optional)
- Database query monitoring

### Backups
- Regular MongoDB backups
- User data export functionality
- Configuration backups

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if MongoDB is running
   - Verify connection string
   - Check firewall settings

2. **CORS Errors**
   - Verify FRONTEND_URL in backend .env
   - Check API URL in frontend .env

3. **Socket.io Issues**
   - Ensure WebSocket support
   - Check proxy configuration
   - Verify socket URL

4. **Authentication Errors**
   - Check JWT secret consistency
   - Verify token expiration
   - Check user permissions

### Performance Optimization

1. **Database**
   - Add indexes for frequent queries
   - Use MongoDB aggregation pipelines
   - Implement connection pooling

2. **API**
   - Enable compression
   - Implement caching
   - Use pagination for large datasets

3. **Frontend**
   - Code splitting
   - Image optimization
   - Bundle analysis

## Support

For technical support or questions:
1. Check the README.md for detailed documentation
2. Review the API documentation
3. Check the troubleshooting section
4. Contact the development team

## License

MIT License - See LICENSE file for details