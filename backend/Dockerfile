# Stage 1: Build binary
FROM golang:1.24-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git ca-certificates tzdata

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o /app/bin/api ./cmd/api

# Stage 2: Minimal runtime
FROM alpine:3.21

WORKDIR /app

RUN apk --no-cache add ca-certificates tzdata

# Copy compiled binary from builder
COPY --from=builder /app/bin/api /app/api

ENV PORT=8080
EXPOSE 8080

# Non-root user for security best practice
USER 10001:10001

ENTRYPOINT ["/app/api"]
