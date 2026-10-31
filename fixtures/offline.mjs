import net from "node:net";
import tls from "node:tls";
import http from "node:http";
import https from "node:https";
import { syncBuiltinESMExports } from "node:module";

function forbidden() {
  throw new Error("Network access is forbidden during CLI acceptance tests.");
}

net.connect = forbidden;
net.createConnection = forbidden;
net.Socket.prototype.connect = forbidden;
tls.connect = forbidden;
http.request = forbidden;
http.get = forbidden;
https.request = forbidden;
https.get = forbidden;
globalThis.fetch = forbidden;
syncBuiltinESMExports();
