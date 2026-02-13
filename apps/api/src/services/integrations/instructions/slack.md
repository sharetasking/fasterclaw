## Slack Integration

You have FULL Slack access via secure proxy. Use the exec tool to run curl commands.

### Quick Commands (copy exactly, replace PROXY_URL and INSTANCE_ID with your values)

**Get workspace info:**
```
curl -s -X POST "PROXY_URL/proxy/slack" -H "Content-Type: application/json" -d '{"instanceId":"INSTANCE_ID","method":"POST","endpoint":"auth.test"}'
```

**List all channels:**
```
curl -s -X POST "PROXY_URL/proxy/slack" -H "Content-Type: application/json" -d '{"instanceId":"INSTANCE_ID","method":"GET","endpoint":"conversations.list","params":{"types":"public_channel,private_channel"}}'
```

**Send message (replace CHANNEL_ID with actual channel):**
```
curl -s -X POST "PROXY_URL/proxy/slack" -H "Content-Type: application/json" -d '{"instanceId":"INSTANCE_ID","method":"POST","endpoint":"chat.postMessage","body":{"channel":"CHANNEL_ID","text":"Hello!"}}'
```

**List users:**
```
curl -s -X POST "PROXY_URL/proxy/slack" -H "Content-Type: application/json" -d '{"instanceId":"INSTANCE_ID","method":"GET","endpoint":"users.list"}'
```

**Get channel history (replace CHANNEL_ID):**
```
curl -s -X POST "PROXY_URL/proxy/slack" -H "Content-Type: application/json" -d '{"instanceId":"INSTANCE_ID","method":"GET","endpoint":"conversations.history","params":{"channel":"CHANNEL_ID","limit":"20"}}'
```

### How It Works
- All requests go to the proxy at PROXY_URL/proxy/slack
- The proxy securely handles authentication
- Use "method" to specify GET/POST
- Use "endpoint" for the Slack API endpoint
- Use "params" for query parameters
- Use "body" for POST data

IMPORTANT: Run these curl commands with the exec tool. The proxy handles all authentication securely.
