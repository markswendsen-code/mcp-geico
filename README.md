# @striderlabs/mcp-geico

**GEICO Insurance MCP server** — let AI agents get insurance quotes, manage policies, file claims, track payments, retrieve digital ID cards, request roadside assistance, and report accidents.

Built by [Strider Labs](https://striderlabs.ai).

---

## Features

- **Insurance Quotes** — Get instant quotes for auto, motorcycle, RV, and homeowners insurance
- **Policy Management** — View and update all active policies on your account
- **Claims** — File new claims and track existing claim status
- **Payments** — View payment history, make immediate payments, or schedule future payments
- **Digital ID Cards** — Retrieve digital insurance ID cards for any policy
- **Roadside Assistance** — Request towing, jump starts, flat tire help, lockouts, fuel delivery, or winch-outs
- **Accident Reporting** — File detailed accident reports with vehicle, witness, and police information

---

## Installation

```bash
npx @striderlabs/mcp-geico
```

Or install globally:

```bash
npm install -g @striderlabs/mcp-geico
```

---

## MCP Configuration

Add to your MCP client configuration (e.g., Claude Desktop `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "geico": {
      "command": "npx",
      "args": ["-y", "@striderlabs/mcp-geico"]
    }
  }
}
```

Or if installed globally:

```json
{
  "mcpServers": {
    "geico": {
      "command": "striderlabs-mcp-geico"
    }
  }
}
```

---

## Available Tools

### Authentication

| Tool | Description |
|------|-------------|
| `geico_status` | Check if you're logged in to GEICO |
| `geico_login` | Log in with your GEICO email and password |
| `geico_logout` | Log out and clear saved session |

### Quotes (no login required)

| Tool | Description |
|------|-------------|
| `geico_get_quote` | Get a quote for auto, motorcycle, RV, or homeowners insurance |

### Policy Management

| Tool | Description |
|------|-------------|
| `geico_list_policies` | List all policies on your account |
| `geico_get_policy` | Get details for a specific policy |
| `geico_update_policy` | Update coverage on an existing policy |

### Claims

| Tool | Description |
|------|-------------|
| `geico_list_claims` | List all claims, optionally filtered by policy |
| `geico_get_claim` | Get status and details of a specific claim |
| `geico_file_claim` | File a new insurance claim |

### Payments

| Tool | Description |
|------|-------------|
| `geico_payment_history` | View recent payment history for a policy |
| `geico_make_payment` | Make an immediate payment |
| `geico_schedule_payment` | Schedule a future payment |

### Digital ID Cards

| Tool | Description |
|------|-------------|
| `geico_get_id_cards` | Retrieve digital insurance ID cards |

### Roadside Assistance

| Tool | Description |
|------|-------------|
| `geico_request_roadside` | Request roadside assistance |
| `geico_roadside_status` | Check status of active roadside request |

### Accident Reporting

| Tool | Description |
|------|-------------|
| `geico_report_accident` | File a detailed accident report |

---

## Usage Examples

### Get an auto insurance quote
```
Get me a quote for auto insurance. I'm John Smith, born 1985-06-15,
at 123 Main St, Austin TX 78701. I drive a 2020 Toyota Camry,
and I'm currently insured.
```

### Check your policies
```
Show me all my active GEICO policies.
```

### File a claim
```
I need to file a claim on policy 4082-44-25-11.
My car was damaged in a hailstorm on 2024-03-10 while parked outside.
```

### Request roadside assistance
```
I need a tow truck. I'm at 1-35 northbound near exit 243 in Austin TX.
My car is a red 2019 Honda Civic. Call me at 512-555-0100.
```

### Report an accident
```
I was in an accident today at Oak and Maple St. Report it on my policy
4082-44-25-11. I was hit by a blue Ford F-150, driver name John Doe,
license plate ABC1234. Police report #2024-7891 filed with Austin PD.
```

---

## Authentication

Session credentials are stored locally at `~/.strider/geico/session.json`. Your password is only sent once during login and is never persisted.

To log out and remove all stored credentials:
```
Log me out of GEICO.
```

---

## License

MIT — [Strider Labs](https://striderlabs.ai)
