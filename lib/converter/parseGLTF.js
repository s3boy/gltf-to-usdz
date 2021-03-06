// Arguments
const { input } = require('./../argsHandler');

// File loader
const fileLoader = require('./../fileLoader');

// Utilities
const { getFilePath } = require('./../utilities');

function parseGLTF(gltf) {
	const inputFilePath = getFilePath(input);

	const {
 accessors, buffers, bufferViews, images, materials, textures, meshes,
} = gltf;

	// Geometry attributes
	const meshAttributesData = meshes[0].primitives[0].attributes;

	// Geometry data
	const meshDataIndicesIndex = meshes[0].primitives[0].indices;
	const meshDataNormalIndex = meshAttributesData.NORMAL;
	const meshDataPositionIndex = meshAttributesData.POSITION;
	const meshDataTexcoordIndex = meshAttributesData.TEXCOORD_0;

	const meshList = new Promise((resolve, reject) => {
		fileLoader(`${inputFilePath}/${buffers[0].uri}`)
			.then((bin) => {
				resolve(accessors.map((accessor) => {
						const min = accessor.min
							.toString()
							.split(',')
							.map(v => parseFloat(v));

						const max = accessor.max
							.toString()
							.split(',')
							.map(v => parseFloat(v));

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

						return {
							min,
							max,
							bufferData,
						};
					}));
			})
			.catch((error) => {
				reject(console.warn(error));
			});
	});

	// Texture data
	let textureList;
	let baseColorTexture = false;
	let metallicRoughnessTexture = false;
	let emissiveTexture = false;
	let occlusionTexture = false;
	let normalTexture = false;

	if (textures) {
		textureList = textures.map(texture => `${images[texture.source].uri}`);

		if (materials[0].pbrMetallicRoughness.baseColorTexture) {
			baseColorTexture =
				textureList[materials[0].pbrMetallicRoughness.baseColorTexture.index];
		}

		if (materials[0].pbrMetallicRoughness.metallicRoughnessTexture) {
			metallicRoughnessTexture =
				textureList[materials[0].pbrMetallicRoughness.metallicRoughnessTexture.index];
		}

		if (materials[0].emissiveTexture) {
			emissiveTexture = textureList[materials[0].emissiveTexture.index];
		}

		if (materials[0].occlusionTexture) {
			occlusionTexture = textureList[materials[0].occlusionTexture.index];
		}

		if (materials[0].normalTexture) {
			normalTexture = textureList[materials[0].normalTexture.index];
		}
	}

	return meshList
		.then((geometryData) => {
			const meshData = {
				textures: {
					baseColorTexture,
					metallicRoughnessTexture,
					emissiveTexture,
					occlusionTexture,
					normalTexture,
				},
				meshes: {
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
