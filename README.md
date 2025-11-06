# SlotSwapper - Full Stack Technical Challenge

This repository contains the source code for "SlotSwapper," a full-stack MERN application built for the ServiceHive technical challenge.

* **Live Application:** *[https://your-frontend-vercel-link.here](https://service-hive-frontend.vercel.app/signup)**
* **Live Backend API:** **[https://service-hive-backend.vercel.app](https://service-hive-backend.vercel.app)**

## 1. Overview and Design Choices

### Project Overview
SlotSwapper is a peer-to-peer time-slot scheduling application. The core concept is that users can add their calendar events, mark them as "swappable," and browse a marketplace of other users' swappable slots. They can then request to swap one of their slots for another, which the other user can accept or reject.

### Design Choices

* **Technology Stack:** I chose the **MERN stack** (MongoDB, Express.js, React, Node.js) as it's a highly popular and cohesive full-stack JavaScript ecosystem.
* **Database:** I used **MongoDB** with Mongoose. Its flexible, document-based nature is ideal for modeling users, events, and swap requests, which have clear relationships but don't require rigid schemas.
* **Backend:** I built a single-file **Express.js** server. For a project this size, it's fast to develop with, and it clearly demonstrates API route creation, middleware handling, and database logic.
* **Frontend:** I used **React** with **Vite** for a fast, modern development experience.
* **UI Library:** I chose **Material-UI (MUI)** to quickly build a professional, responsive, and clean user interface without needing custom CSS, allowing me to focus on the core logic.
* **Authentication:** I implemented **JWT (JSON Web Tokens)** stored in `localStorage`. This is a standard, stateless way to handle authenticated sessions between the React client and the Express backend.
* **State Management:**
    * **Frontend:** I used the **React Context API** for global authentication state (managing the user and token). All other state (form inputs, data lists) is handled with component-level `useState` and `useEffect` hooks, which is efficient for this application's needs.
    * **Backend:** The core "swap" logic is managed through `status` fields (`BUSY`, `SWAPPABLE`, `SWAP_PENDING` on events; `PENDING`, `ACCEPTED`, `REJECTED` on requests). This creates a simple, effective state machine for handling the multi-step transaction of a swap.

---

## 2. Step-by-Step Local Setup

### Prerequisites
* [Node.js](https://nodejs.org/) (v18.x or later)
* A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account (or a local MongoDB instance)
* A MongoDB Connection String (we'll call it `DBURL`)

### Backend Setup

1.  **Clone the repository:**
    ```bash
    git clone [your-github-repo-link]
    cd [your-repo-folder]/backend
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Create your environment file:**
    Create a file named `.env` in the `/backend` directory and add the following:
    ```
    PORT=5001
    DBURL=[YOUR_MONGODB_CONNECTION_STRING]
    JWT_SECRET=thisisasecretkey
    ```
    *Note: The `JWT_SECRET` can be any string.*

4.  **Run the backend server:**
    ```bash
    npm run dev
    ```
    The server will be running on `http://localhost:5001`.

### Frontend Setup

1.  **Open a new terminal** and navigate to the `frontend` folder:
    ```bash
    cd [your-repo-folder]/frontend
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Run the frontend client:**
    ```bash
    npm run dev
    ```
    Your browser will open to `http://localhost:5173` (or a similar port). The app is now running, but it's pointed at the *live* backend by default.

4.  **Connect to your local backend:**
    * Open `/frontend/src/services/api.js`.
    * Change the `API_URL` to point to your local server:
    ```javascript
    // Change this:
    // const API_URL = "[https://service-hive-backend.vercel.app/api](https://service-hive-backend.vercel.app/api)";

    // To this:
    const API_URL = "http://localhost:5001/api";
    ```
    The app will now use your local backend server for all requests.

---

## 3. API Endpoints

All protected routes require a `Bearer <token>` in the `Authorization` header.

| Method | Endpoint | Protection | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | | | |
| `POST` | `/api/auth/register` | Public | Register a new user. |
| `POST` | `/api/auth/login` | Public | Log in a user and receive a JWT. |
| **Events** | | | |
| `POST` | `/api/events` | Private | Create a new event for the logged-in user. |
| `GET` | `/api/events` | Private | Get all events owned by the logged-in user. |
| `PUT` | `/api/events/:id` | Private | Update an event (e.g., change title or status). |
| `DELETE` | `/api/events/:id` | Private | Delete an event. |
| **Swap** | | | |
| `GET` | `/api/swap/swappable-slots` | Private | Get all events from *other* users marked `SWAPPABLE`. |
| `POST` | `/api/swap/request` | Private | Create a swap request (links `mySlotId` and `theirSlotId`). |
| `POST` | `/api/swap/response/:id` | Private | Respond (accept/reject) to an incoming swap request. |
| `GET` | `/api/swap/requests/incoming` | Private | Get all `PENDING` requests for the logged-in user. |
| `GET` | `/api/swap/requests/outgoing` | Private | Get all requests made by the logged-in user. |

---

## 4. Assumptions and Challenges

### Assumptions

* For simplicity, I assumed events are generic and do not require complex recurrence or overlapping time conflict checks.
* I used the browser's native `<input type="datetime-local">` for simplicity, rather than integrating a larger third-party date-picking library.
* I assumed a basic "happy path" for swapping, where users act in good faith. The system primarily ensures that a slot cannot be double-booked or swapped once it's in a pending state.

### Challenges Faced

* **Deployment:** The most significant challenge was deploying the backend to a serverless environment like Vercel. I encountered a `500` error with a Mongoose `buffering timed out` message.
    * **Solution:** This was a two-part solution:
        1.  **Environment Variables:** I had to ensure the `DBURL` and `JWT_SECRET` were correctly configured in the Vercel project settings.
        2.  **IP Whitelist:** The key insight was that Vercel's serverless functions have dynamic IP addresses. I had to configure my **MongoDB Atlas Network Access** to "Allow Access From Anywhere" (`0.0.0.0/0`) to permit Vercel's servers to connect to the database. Resolving this was a major learning experience in serverless deployment.

* **Transactional Logic:** Ensuring the "swap" was handled correctly was a fun challenge. I had to make sure that when a swap was accepted, the owners were *exchanged* on both `Event` documents, and both statuses were set back to `BUSY`—all in a single API call. This required careful backend logic to feel like a single transaction.
