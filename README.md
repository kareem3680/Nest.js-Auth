<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
</p>

# Backend Auth API

A **Multi-Tenant Authentication and User Management API** built using the NestJS framework.

This project provides a scalable authentication system with:

- Multi-tenant architecture
- JWT authentication
- Role-based access control
- Company-level isolation
- Admin and Super Admin dashboards
- OTP password recovery
- Logging and caching support

---

## Project Setup

```bash
npm install
```

## Run The Project

```bash
# development
npm run start

# watch mode
npm run start:dev

# production
npm run start:prod
```

---

## API Documentation

### Overview

This API provides an authentication and user management system built with a **Multi-Tenant** architecture, where each company operates in a completely isolated environment with its own data and users.

### Multi-Tenant Isolation

- The **Super Admin** is the only entity allowed to create companies (Tenants)
- When a company is created, all users are automatically linked to that company
- The `companyId` is injected automatically through JWT
- Each Admin manages only users inside their company
- Companies and users can be activated or deactivated

---

### Common Features

All list endpoints support:

| Feature         | Description              | Example                          |
| --------------- | ------------------------ | -------------------------------- |
| Pagination      | Split results into pages | `?page=2&limit=20`               |
| Sorting         | Sort results             | `?sort=-createdAt`               |
| Field Selection | Select specific fields   | `?fields=name,email`             |
| Filtering       | Filter by value          | `?role=admin`                    |
| Range Filtering | Numeric range            | `?age[gte]=25`                   |
| Date Range      | Filter by date           | `?from=2025-01-01&to=2025-12-31` |
| Search          | Text search              | `?keyword=ahmed`                 |

---

### Identity Module

| Endpoint                             | Method  | Description          |
| ------------------------------------ | ------- | -------------------- |
| `/api/v1/auth/refresh`               | `POST`  | Refresh access token |
| `/api/v1/auth/signUp`                | `POST`  | Register new user    |
| `/api/v1/auth/logIn`                 | `POST`  | Login                |
| `/api/v1/auth/logout`                | `POST`  | Logout               |
| `/api/v1/userDashboard/getMyData`    | `GET`   | Get current user     |
| `/api/v1/userDashboard/updateMyData` | `PATCH` | Update profile       |
| `/api/v1/updatePassword`             | `PATCH` | Change password      |

---

### Password Recovery (OTP)

| Endpoint                                 | Method | Description     |
| ---------------------------------------- | ------ | --------------- |
| `/api/v1/forgetPassword/sendResetCode`   | `POST` | Send reset code |
| `/api/v1/forgetPassword/resendResetCode` | `POST` | Resend code     |
| `/api/v1/forgetPassword/verifyResetCode` | `POST` | Verify code     |
| `/api/v1/forgetPassword/resetPassword`   | `PUT`  | Reset password  |

---

### Super Admin Dashboard

| Endpoint                                   | Method  | Description        |
| ------------------------------------------ | ------- | ------------------ |
| `/api/v1/companies`                        | `POST`  | Create company     |
| `/api/v1/companies`                        | `GET`   | Get companies      |
| `/api/v1/companies/{companyId}`            | `GET`   | Company details    |
| `/api/v1/companies/{companyId}`            | `PATCH` | Update company     |
| `/api/v1/companies/deactivate/{companyId}` | `PATCH` | Deactivate company |
| `/api/v1/companies/activate/{companyId}`   | `PATCH` | Activate company   |
| `/api/v1/adminDashboard`                   | `POST`  | Create admin       |

---

### Admin Dashboard

| Endpoint                                     | Method  | Description     |
| -------------------------------------------- | ------- | --------------- |
| `/api/v1/adminDashboard`                     | `POST`  | Create user     |
| `/api/v1/adminDashboard`                     | `GET`   | Get users       |
| `/api/v1/adminDashboard/{userId}`            | `GET`   | User details    |
| `/api/v1/adminDashboard/{userId}`            | `PATCH` | Update role     |
| `/api/v1/adminDashboard/deactivate/{userId}` | `PATCH` | Deactivate user |
| `/api/v1/adminDashboard/activate/{userId}`   | `PATCH` | Activate user   |

---

## Multi-Tenant Architecture

```
Super Admin
      │
      ▼
Companies (Tenants)
      │
      ▼
   Admins
      │
      ▼
   Users
```

Each company operates with **fully isolated** data and users.

---

## Example Query

```http
GET /api/v1/adminDashboard?page=2&limit=15&role=admin&active=true&sort=-createdAt&fields=name,email&keyword=ahmed
```

---

## License

This project is licensed under the [MIT License](LICENSE).
