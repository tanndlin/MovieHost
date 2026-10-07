# Packages the dist/ built by Jenkins' "Install & Build Frontend" stage
# instead of rebuilding. For local builds use `dockerfile`.
FROM nginx:alpine-slim
COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
