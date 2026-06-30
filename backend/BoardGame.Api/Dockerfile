# --- Build stage ---
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY BoardGame.Api.csproj ./
RUN dotnet restore

COPY . ./
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# --- Runtime stage ---
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
# curl dùng cho docker-compose healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/publish ./

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "BoardGame.Api.dll"]
