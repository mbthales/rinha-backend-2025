CREATE TYPE PROCESSOR AS ENUM('default', 'fallback');

CREATE TABLE payments (
  id UUID PRIMARY KEY,
  amount NUMERIC(10,2) NOT NULL,
  processor PROCESSOR NOT NULL,
  request_time TIMESTAMP NOT NULL
);
