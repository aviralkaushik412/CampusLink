# Real-Time Chat Application

A modern real-time chat application built with React, Node.js, Socket.IO, and MongoDB.

## Features

- Real-time messaging
- User authentication
- Image sharing
- Active user tracking
- Message history
- Modern UI design

## Tech Stack

- **Frontend:**
  - React
  - Vite
  - Socket.IO Client
  - Modern CSS

- **Backend:**
  - Node.js
  - Express
  - Socket.IO
  - MongoDB
  - JWT Authentication

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- Git

### Local Development

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd <repo-name>
```

2. **Backend Setup**
```bash
cd Server
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm start
```

3. **Frontend Setup**
```bash
cd Frontend
npm install
cp .env.example .env
# Edit .env with your backend URLs
npm run dev
```

### Environment Variables

#### Backend (.env)
```
PORT=3000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

#### Frontend (.env)
```
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

## Deployment

### Backend (Render)
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure:
   - Build Command: `cd Server && npm install`
   - Start Command: `cd Server && node server.js`
   - Add environment variables

### Frontend (Netlify)
1. Create a new site on Netlify
2. Connect your GitHub repository
3. Configure:
   - Base directory: Frontend
   - Build command: `npm run build`
   - Publish directory: Frontend/dist
   - Add environment variables

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details 