# hr

## Building the project

To build the project, run either of the following commands:

```bash
npm run build
```

or

```bash
yarn build
```

This command will build both the client and server components.

The client build output will be located in the `dist/public` directory.
The server build output will be located in the `dist` directory.

## Running the project locally

### Prerequisites
- **Database Connection URL:** This project requires a connection to a PostgreSQL database. You'll need to set the `DATABASE_URL` environment variable to point to your database. For example:
  ```bash
  export DATABASE_URL="postgresql://user:password@host:port/database_name"
  ```
  Replace `user`, `password`, `host`, `port`, and `database_name` with your actual database credentials and connection details. You might need to install and configure a local PostgreSQL server if you don't have one.

### Database Setup Notes
The project utilizes Drizzle ORM for database interactions (see `drizzle.config.ts`) and expects a PostgreSQL database. If you're setting up a new local PostgreSQL instance, make sure it's running and you've created a database for this project. The `DATABASE_URL` you set as an environment variable should point to this database.

To run the project locally, follow these steps:

1.  **Install dependencies:**

    Open your terminal and run one of the following commands:

    ```bash
    npm install
    ```

    or

    ```bash
    yarn install
    ```

2.  **Start the development server:**

    After the dependencies are installed, start the development server by running:

    ```bash
    npm run dev
    ```

    or

    ```bash
    yarn dev
    ```

    This will start the development server. You should see output in your console indicating the address where the application is being served. By default, this is typically `http://localhost:5173` for the Vite client-side development server. The server-side components will also be running, handling API requests and other backend logic.