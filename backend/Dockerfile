FROM golang:1.26.2-bookworm

RUN apt-get update && apt-get install -y \
    minizinc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

EXPOSE 8080

CMD ["go", "run", "."]
