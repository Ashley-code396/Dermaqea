import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';

const PROTO_PATH = path.join(__dirname, 'protos/sui/rpc/v2/ledger_service.proto');

// Load proto definitions
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [path.join(__dirname, 'protos')],
});

const suiProto = grpc.loadPackageDefinition(packageDefinition) as any;
const LedgerService = suiProto.sui.rpc.v2.LedgerService;

// Create gRPC client
const grpcClient = new LedgerService('fullnode.testnet.sui.io:443', grpc.credentials.createSsl());

// Sample transaction digest in Base58 format
const base58Digest = '3ByWphQ5sAVojiTrTrGXGM5FmCVzpzYmhsjbhYESJtxp';

// Construct the request
const request = {
    digest: base58Digest,
    read_mask: {
        paths: ['events', 'effects'],
    },
};

// Make gRPC call
grpcClient.GetTransaction(request, (err: any, response: any) => {
    if (err) {
        console.error('Error:', err);
        return;
    }
    console.log('Response:', JSON.stringify(response, null, 2));
});