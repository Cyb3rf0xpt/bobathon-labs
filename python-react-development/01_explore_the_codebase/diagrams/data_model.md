# Data Model Diagram

```mermaid
erDiagram
    USERS {
        string username PK
        string hashed_password
        string role
    }

    CUSTOMERS {
        string customer_id PK
        string name
        string email
    }

    ACCOUNTS {
        string account_id PK
        string iban
        string customer_id FK
        float overdraft_limit_eur
    }

    TRANSACTIONS {
        string tx_id PK
        string account_id FK
        string booking_ts
        float amount_eur
        string type
    }

    CUSTOMERS ||--o{ ACCOUNTS : "has"
    ACCOUNTS ||--o{ TRANSACTIONS : "has"
```

## Transaction Types

| Type | Description |
|---|---|
| `TRANSFER_OUT` | Debit leg of an internal transfer |
| `TRANSFER_IN` | Credit leg of an internal transfer |
| `FEE_REVERSAL` | Manual fee reversal (BACKOFFICE only) |
| `MANUAL_ADJ` | Manual adjustment (BACKOFFICE only) |
