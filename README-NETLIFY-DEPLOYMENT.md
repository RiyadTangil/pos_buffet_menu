# Netlify Deployment Guide

## Environment Variables Setup

To deploy this application on Netlify, you need to configure the following environment variables in your Netlify dashboard:

### Required Environment Variables

1. **MONGODB_URI**
   - Value: `mongodb+srv://riyadhasan:riyadhasan@cluster0.ixqhz.mongodb.net/buffet_restaurant?retryWrites=true&w=majority`
   - Description: MongoDB connection string

2. **NEXTAUTH_SECRET**
   - Value: Generate a secure random string (32+ characters)
   - Description: Secret key for NextAuth.js authentication

3. **NEXTAUTH_URL**
   - Value: `https://your-netlify-app-name.netlify.app`
   - Description: Your deployed application URL

4. **API_BASE_URL**
   - Value: `https://your-netlify-app-name.netlify.app/api`
   - Description: Base URL for API calls

5. **NEXT_PUBLIC_API_URL**
   - Value: `https://your-netlify-app-name.netlify.app/api`
   - Description: Public API URL for client-side calls

6. **NEXT_PUBLIC_SOCKET_URL**
   - Value: `https://your-netlify-app-name.netlify.app`
   - Description: Socket.IO URL (Note: Will not work on Netlify)

7. **NODE_ENV**
   - Value: `production`
   - Description: Node environment

## Socket.IO Limitations

⚠️ **Important**: Socket.IO real-time functionality will not work on Netlify due to serverless architecture limitations.

### Affected Features:
- Real-time table updates on `/menu/tables` page
- Live cart synchronization between devices
- Instant order notifications

### Workarounds:
1. **Polling**: The application will fall back to periodic API polling for updates
2. **Manual Refresh**: Users may need to refresh pages to see latest data
3. **Alternative Hosting**: Consider deploying to platforms that support WebSockets (Vercel, Railway, Heroku)

## Deployment Steps

1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `.next`
4. Add all environment variables listed above
5. Deploy the application

## Post-Deployment

After deployment, test the following:
- ✅ Static pages load correctly
- ✅ API routes work (tables, orders, settings)
- ✅ Authentication functions
- ❌ Real-time updates (expected to not work)
- ✅ Manual data refresh works

## Alternative Solutions

For full Socket.IO support, consider:
1. **Vercel**: Supports serverless functions with WebSocket capabilities
2. **Railway**: Full server deployment with persistent connections
3. **Heroku**: Traditional server hosting
4. **DigitalOcean App Platform**: Container-based deployment