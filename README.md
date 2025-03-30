# Hockey App Medical Service

A service that handles medical records, injuries, treatments, rehabilitation plans, and progress tracking for hockey teams in a multi-service architecture.

## Features

- Injury tracking and management
- Treatment records
- Rehabilitation plans
- Progress notes
- Medical reports
- Role-based access control
- Integration with user-service and communication-service

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Docker and Docker Compose (for containerized deployment)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/Stormrider66/hockeyapp-medical-service.git
   cd hockeyapp-medical-service
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```

4. Start the service:
   ```
   npm run dev
   ```

### Docker Deployment

To run the service with Docker:

```
docker build -t medical-service .
docker run -p 3005:3005 --env-file .env medical-service
```

With Docker Compose (recommended for the full app with all services):

```
docker-compose up -d
```

## API Endpoints

### Injuries

- `GET /api/injuries` - Get all injuries (admin, medical staff)
- `GET /api/injuries/team/:teamId` - Get team injuries (admin, team admin, coach, medical)
- `GET /api/injuries/player/:playerId` - Get player injuries (admin, team admin, coach, medical, own player)
- `GET /api/injuries/active` - Get active injuries (admin, medical)
- `GET /api/injuries/:id` - Get injury details (admin, team admin, coach, medical, own player)
- `POST /api/injuries` - Create new injury (medical staff, admin)
- `PUT /api/injuries/:id` - Update injury (medical staff, admin)
- `DELETE /api/injuries/:id` - Delete injury (admin only)
- `PATCH /api/injuries/:id/status` - Mark injury as inactive/healed (medical staff, admin)

### Treatments

- `GET /api/treatments/injury/:injuryId` - Get treatments for an injury
- `POST /api/treatments` - Add new treatment
- `PUT /api/treatments/:id` - Update treatment
- `DELETE /api/treatments/:id` - Delete treatment

### Rehabilitation Plans

- `GET /api/rehab/injury/:injuryId` - Get rehab plans for an injury
- `POST /api/rehab` - Create new rehab plan
- `PUT /api/rehab/:id` - Update rehab plan
- `DELETE /api/rehab/:id` - Delete rehab plan
- `PATCH /api/rehab/:id/status` - Update rehab plan status

### Progress Notes

- `GET /api/progress/rehab/:rehabId` - Get progress notes for a rehab plan
- `GET /api/progress/user/:userId` - Get all progress notes for a user
- `POST /api/progress` - Add new progress note
- `PUT /api/progress/:id` - Update progress note
- `DELETE /api/progress/:id` - Delete progress note

### Medical Reports

- `GET /api/reports/user/:userId` - Get medical reports for a user
- `GET /api/reports` - Get all medical reports (admin, medical staff)
- `POST /api/reports` - Create new medical report
- `PUT /api/reports/:id` - Update medical report
- `DELETE /api/reports/:id` - Delete medical report

## Project Structure

```
medical-service/
├── src/
│   ├── controllers/       # Request handlers
│   ├── db/                # Database connection and migrations
│   ├── middlewares/       # Auth, error handling, etc.
│   ├── routes/            # API routes
│   ├── utils/             # Utilities and helpers
│   ├── app.js             # Express app setup
│   └── server.js          # Server entry point
├── .env.example           # Example environment variables
├── Dockerfile             # Docker configuration
├── package.json           # Dependencies and scripts
└── README.md              # Documentation
```

## License

This project is licensed under the MIT License.

## Contact

Henrik Lundholm - henrik.lundholm@gmail.com