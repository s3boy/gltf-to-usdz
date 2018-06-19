// Arguments
const { input } = require('./../argsHandler');

// File loader
const fileLoader = require('./../fileLoader');

// Utilities
const { getFilePath } = require('./../utilities');

function parseGLTF(gltf) {
	const filepath = getFilePath(input);

	const {
 accessors, buffers, bufferViews, images, materials, nodes, textures, meshes,
} = gltf;

	// Geometry attributes
	const meshAttributesData = meshes[0].primitives[0].attributes;

	// Geometry data
	const meshDataIndicesIndex = meshes[0].primitives[0].indices;
	const meshDataNormalIndex = meshAttributesData.NORMAL;
	const meshDataPositionIndex = meshAttributesData.POSITION;
	const meshDataTexcoordIndex = meshAttributesData.TEXCOORD_0;

	// console.log(gltf);

	const meshList = new Promise((resolve, reject) => {
		fileLoader(`${filepath}/${buffers[0].uri}`)
			.then((bin) => {
				resolve(accessors.map((accessor) => {
						const bufferViewData = bufferViews[accessor.bufferView];
						const slicedBuffer = bin.slice(
							bufferViewData.byteOffset,
							bufferViewData.byteOffset + bufferViewData.byteLength,
						);

						let bufferData;

						if (accessor.componentType === 5126) {
							bufferData = new Float32Array(slicedBuffer);
						} else if (accessor.componentType === 5123) {
							bufferData = new Uint16Array(slicedBuffer);
						} else {
							console.warn('componentType is unknown');
						}

						return bufferData;
					}));
			})
			.catch((error) => {
				reject(console.warn(error));
			});
	});

	// Texture data
	const textureDataBaseIndex = materials[0].pbrMetallicRoughness.baseColorTexture.index;
	const textureDataNormalIndex = materials[0].normalTexture.index;
	const textureDataMetallicRoughnessIndex =
		materials[0].pbrMetallicRoughness.metallicRoughnessTexture.index;
	const textureDataEmissiveIndex = materials[0].emissiveTexture.index;
	const textureDataOcclusionIndex = materials[0].occlusionTexture.index;

	// Texture factors
	const {
 baseColorFactor, metallicFactor, roughnessFactor, emissiveFactor,
} = materials[0];

	const textureList = textures.map(texture => `${images[texture.source].uri}`);

	return meshList
		.then((geometryData) => {
			const meshData = {
				textures: {
					baseColorTexture: textureList[textureDataBaseIndex] || false,
					metallicRoughnessTexture:
						textureList[textureDataMetallicRoughnessIndex] || false,
					emissiveTexture: textureList[textureDataEmissiveIndex] || false,
					occlusionTexture: textureList[textureDataOcclusionIndex] || false,
					normalTexture: textureList[textureDataNormalIndex] || false,
				},
				factors: {
					baseColorFactor,
					metallicFactor,
					roughnessFactor,
					emissiveFactor,
				},
				meshes: {
					rotation: nodes[0].rotation,
					vertices: geometryData[meshDataPositionIndex],
					normals: geometryData[meshDataNormalIndex],
					indices: geometryData[meshDataIndicesIndex],
					uvs: geometryData[meshDataTexcoordIndex],
				},
			};

			return meshData;
		})
		.catch((error) => {
			console.warn(error);
		});
}

module.exports = parseGLTF;