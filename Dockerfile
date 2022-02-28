FROM ubuntu:latest

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install --no-install-recommends -y npm && npm install -g web-ext
ENTRYPOINT ["web-ext", "build"]
