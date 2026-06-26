export type SnakeDirection = 'up' | 'down' | 'left' | 'right';

export type SnakeSegment = {
  x: number;
  y: number;
};

export type SnakePlayer = {
  participantId: string;
  name: string;
  body: SnakeSegment[];
  direction: SnakeDirection;
  alive: boolean;
  score: number;
  color: string;
};

export type SnakeState = {
  width: number;
  height: number;
  food: SnakeSegment;
  snakes: SnakePlayer[];
  tick: number;
};

export type SnakeDirectionPayload = {
  direction: SnakeDirection;
};
