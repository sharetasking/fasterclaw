## GitHub Integration

You have FULL GitHub access via secure proxy. Use the exec tool to run curl commands.

### Quick Commands (copy exactly, replace PROXY_URL and INSTANCE_ID with your values)

**Get user info and repo counts:**
```
curl -s -X POST "PROXY_URL/proxy/github" -H "Content-Type: application/json" -d '{"instanceId":"INSTANCE_ID","method":"GET","endpoint":"user"}'
```
Response includes: public_repos, total_private_repos, owned_private_repos

**List repositories:**
```
curl -s -X POST "PROXY_URL/proxy/github" -H "Content-Type: application/json" -d '{"instanceId":"INSTANCE_ID","method":"GET","endpoint":"user/repos","params":{"per_page":"100","type":"all"}}'
```

**Get specific repo (replace OWNER/REPO):**
```
curl -s -X POST "PROXY_URL/proxy/github" -H "Content-Type: application/json" -d '{"instanceId":"INSTANCE_ID","method":"GET","endpoint":"repos/OWNER/REPO"}'
```

**List issues (replace OWNER/REPO):**
```
curl -s -X POST "PROXY_URL/proxy/github" -H "Content-Type: application/json" -d '{"instanceId":"INSTANCE_ID","method":"GET","endpoint":"repos/OWNER/REPO/issues","params":{"state":"open"}}'
```

**List pull requests (replace OWNER/REPO):**
```
curl -s -X POST "PROXY_URL/proxy/github" -H "Content-Type: application/json" -d '{"instanceId":"INSTANCE_ID","method":"GET","endpoint":"repos/OWNER/REPO/pulls","params":{"state":"open"}}'
```

**Create issue (replace OWNER/REPO):**
```
curl -s -X POST "PROXY_URL/proxy/github" -H "Content-Type: application/json" -d '{"instanceId":"INSTANCE_ID","method":"POST","endpoint":"repos/OWNER/REPO/issues","body":{"title":"Issue Title","body":"Issue description"}}'
```

### How It Works
- All requests go to the proxy at PROXY_URL/proxy/github
- The proxy securely handles authentication
- Use "method" to specify GET/POST/PUT/PATCH/DELETE
- Use "endpoint" for the GitHub API endpoint (without https://api.github.com/)
- Use "params" for query parameters
- Use "body" for POST/PUT/PATCH data

IMPORTANT: Run these curl commands with the exec tool. The proxy handles all authentication securely.
