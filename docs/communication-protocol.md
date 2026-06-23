# Communication Protocol

Citadel Chat uses Socket.IO so the browser and server can keep a live connection open.

In simple terms: the browser and server agree on a small set of event names. The browser sends events like "join" or "send message", and the server sends events like "new message" or "user left".

## Transport

- Client: React browser app
- Server: Express and Socket.IO
- Local backend: `http://localhost:3001`
- Local frontend: `http://localhost:5173`
- Socket path: `/socket.io`

In development, Vite forwards Socket.IO traffic from the frontend to the backend.

## Rooms

Each chat room has a `roomId`.

Examples:

```text
general
design
```

If the room ID is missing or invalid, the app uses `general`.

Rooms keep users, messages, and typing status separate.

## Client To Server Events

### `join`

Sent when a user joins or switches rooms.

```ts
{
  name: string;
  roomId?: string;
}
```

### `message:send`

Sent when a user sends a message.

```ts
{
  body: string;
}
```

### `typing:start`

Sent when a user starts typing.

```text
no payload
```

### `typing:stop`

Sent when a user stops typing.

```text
no payload
```

## Server To Client Events

### `room:state`

Sent with the current room users and recent messages.

```ts
{
  roomId: string;
  users: User[];
  messages: ChatMessage[];
}
```

### `message:new`

Sent when a new message is saved.

```ts
{
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  body: string;
  createdAt: string;
}
```

### `user:joined`

Sent when another user joins the room.

```ts
{
  id: string;
  type: "user:joined";
  user: User;
  createdAt: string;
}
```

### `user:left`

Sent when a user leaves or disconnects.

```ts
{
  id: string;
  type: "user:left";
  user: User;
  createdAt: string;
}
```

### `typing:update`

Sent when the list of typing users changes.

```ts
{
  roomId: string;
  users: User[];
}
```

### `error:notice`

Sent when the client sends invalid data.

```ts
{
  message: string;
}
```

## Basic Flow

1. The browser opens a Socket.IO connection.
2. The server sends `room:state`.
3. The browser sends `join`.
4. The server validates the user and room.
5. The server sends the updated `room:state`.
6. The browser sends messages with `message:send`.
7. The server saves messages and broadcasts `message:new`.
8. Typing status is handled with `typing:start`, `typing:stop`, and `typing:update`.
9. When a user disconnects, the server broadcasts `user:left`.

## Validation

- Display names cannot be empty.
- Display names must be 24 characters or fewer.
- Messages cannot be empty.
- Messages must be 500 characters or fewer.
- Room IDs can use lowercase letters, numbers, and hyphens.
- Room IDs must be 32 characters or fewer.

