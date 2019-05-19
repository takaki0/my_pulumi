import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

// Create a GCP resource (Storage Bucket)
//const bucket = new gcp.storage.Bucket("my-bucket");

// Export the DNS name of the bucket
//export const bucketName = bucket.url;

const baseName = `cloudace-pulumi-${pulumi.getStack()}`;
const region = "asia-northeast1";
const subnetCidrs = ['10.0.20.0/24', '10.0.21.0/24', '10.0.22.0/24'];
const numberOfVirtualMachines = 3;
const machineType = 'f1-micro';
const image = 'debian-cloud/debian-9-stretch-v20181210';

/**
 * Subnetを作る関数
 */
const createSubnet = function (networkId: pulumi.Output<string>, subnetName: string, cidr: string, region: string): gcp.compute.Subnetwork {
  let subnet = new gcp.compute.Subnetwork(subnetName, {
    name: subnetName,
    network: networkId,
    region: region,
    ipCidrRange: `${cidr}`,
    enableFlowLogs: true,
  });
  return subnet;
}

const getArrayElement = function <T>(values: T[], index: number): T {
  return values[Math.abs(index) % values.length];
}

/**
* Networkを作る
*/
const network = new gcp.compute.Network(baseName, {
  name: baseName,
  autoCreateSubnetworks: false,
});


/**
* Subnetを作る
*/
const subnets = subnetCidrs.map((cidr, i) => {
  return createSubnet(network.id, `${baseName}-${i}`, cidr, region);
});

/**
* zone取得
*/
const zoneResult = gcp.compute.getZones({region});

/**
* VMを作る
*/
const virtualMachines = [];
for (let i = 0; i < numberOfVirtualMachines; i++) {
  const zone = zoneResult.then(z => getArrayElement(z.names, i));
  const subnet = getArrayElement(subnets, i).selfLink;

  const virtualMachine = new gcp.compute.Instance(`${baseName}-${i}`, {
    machineType: machineType,
    zone: zone,
    bootDisk: {
      initializeParams: {
        image: image,
      },
    },
    networkInterfaces: [{
      subnetwork: subnet,
      accessConfigs: [{}],
    }],
  });
  virtualMachines.push(virtualMachine);
}

export const networkId = network.id;
export const virtualMachineNames = virtualMachines.map(vm => vm.name);




