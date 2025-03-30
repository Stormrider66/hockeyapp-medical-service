# HockeyApp Medical Service

Medical service för HockeyApp - hanterar skador, behandlingar, rehabplaner och medicinsk uppföljning.

## Funktioner

- Hantering av spelares skador och sjukdomar
- Behandlingsplanering och -uppföljning
- Rehabiliteringsplaner med framstegsspårning
- Medicinsk rapportering och dokumentation
- Integrering med user-service för användaruppgifter
- Integrering med communication-service för notifieringar

## Teknisk översikt

- Node.js / Express backend API
- PostgreSQL databas
- JWT-baserad autentisering
- Role-based access control (RBAC)
- Docker-containerisering

## API-endpoints

- `GET /health` - Hälsokontroll av tjänsten
- `GET /api/injuries` - Lista alla skador (filtreringsmöjligheter)
- `GET /api/injuries/:id` - Hämta en specifik skada
- `POST /api/injuries` - Registrera en ny skada
- `PUT /api/injuries/:id` - Uppdatera en skada
- `DELETE /api/injuries/:id` - Ta bort en skada
- `GET /api/treatments` - Lista alla behandlingar
- `GET /api/treatments/:id` - Hämta en specifik behandling
- `POST /api/treatments` - Registrera en ny behandling
- `PUT /api/treatments/:id` - Uppdatera en behandling
- `DELETE /api/treatments/:id` - Ta bort en behandling
- `GET /api/rehab/plans` - Lista alla rehabiliteringsplaner
- `GET /api/rehab/plans/:id` - Hämta en specifik rehabiliteringsplan
- `POST /api/rehab/plans` - Skapa en ny rehabiliteringsplan
- `PUT /api/rehab/plans/:id` - Uppdatera en rehabiliteringsplan
- `DELETE /api/rehab/plans/:id` - Ta bort en rehabiliteringsplan
- `GET /api/rehab/plans/:id/progress` - Hämta framstegsnoteringat för en plan
- `POST /api/rehab/plans/:id/progress` - Lägg till en framstegsnotering
- `GET /api/progress/user/:userId` - Hämta alla framstegsnoteringar för en användare
- `GET /api/progress/:id` - Hämta en specifik framstegsnotering
- `PUT /api/progress/:id` - Uppdatera en framstegsnotering
- `DELETE /api/progress/:id` - Ta bort en framstegsnotering
- `GET /api/reports` - Lista alla medicinska rapporter
- `GET /api/reports/:id` - Hämta en specifik medicinsk rapport
- `POST /api/reports` - Skapa en ny medicinsk rapport
- `PUT /api/reports/:id` - Uppdatera en medicinsk rapport
- `DELETE /api/reports/:id` - Ta bort en medicinsk rapport

## Datamodeller

- Injury (Skada)
- Treatment (Behandling)
- RehabPlan (Rehabiliteringsplan)
- ProgressNote (Framstegsnotering)
- MedicalReport (Medicinsk rapport)

## Installation

1. Klona repositoryt
2. Kör `npm install`
3. Kopiera `.env.example` till `.env` och uppdatera värdena
4. Starta tjänsten med `npm start` eller `npm run dev` för utvecklingsläge

## Docker-användning

```bash
# Bygg Docker-image
docker build -t hockey-medical-service .

# Kör containern
docker run -p 3005:3005 --env-file .env --name hockey-medical-service hockey-medical-service
```

## Relaterade tjänster

- user-service - För användarhantering
- communication-service - För notifieringar och meddelanden
- calendar-service - För schemaläggning av behandlingar och rehabilitering