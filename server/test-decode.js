const b64 = "BQNMMTgzMjY3MTU0MDgy";
const buf = Buffer.from(b64, 'base64');
console.log("Hex:", buf.toString('hex'));
console.log("UTF8:", buf.toString('utf8'));
