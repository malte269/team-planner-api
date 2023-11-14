/*import * as tf from '@tensorflow/tfjs-node';
import { ModelCompileArgs } from '@tensorflow/tfjs-layers/dist/engine/training';
import { Tensor } from '@tensorflow/tfjs-core';
import { ModelFitArgs } from '@tensorflow/tfjs-layers/dist/engine/training_tensors';

const MODEL_BASE_URL = 'file://src/my-ai/models/';
const MODEL_COMPILE_OPTIONS: ModelCompileArgs = {
  loss: 'meanSquaredError',
  optimizer: 'adam',
};
const DEFAULT_MODEL_NAME = 'Primus';

export function initModel(
  modelName: string = DEFAULT_MODEL_NAME,
  options: {
    vocabSize: number;
    embeddingDim: number;
    rnnUnits: number;
  } = {
    vocabSize: 26,
    embeddingDim: 10,
    rnnUnits: 1,
  },
) {
  const modelArchitecture = tf.sequential({
    name: modelName,
    layers: [
      tf.layers.simpleRNN({
        units: options.rnnUnits,
        returnSequences: true,
        inputShape: [26],
      }),
      ...new Array(4).fill(0).map(() =>
        tf.layers.simpleRNN({
          units: options.rnnUnits,
          returnSequences: true,
        }),
      ),
      tf.layers.simpleRNN({
        units: options.rnnUnits,
        returnSequences: false,
      }),
    ],
  });
  modelArchitecture.compile(MODEL_COMPILE_OPTIONS);
  return modelArchitecture;
}

export async function saveModel(model: tf.LayersModel) {
  await model.save(MODEL_BASE_URL + (model.name ?? DEFAULT_MODEL_NAME));
}

export async function loadModel(modelName: string = DEFAULT_MODEL_NAME) {
  const model = await tf.loadLayersModel(
    MODEL_BASE_URL + `${modelName}/model.json`,
  );
  model.compile(MODEL_COMPILE_OPTIONS);
  return model;
}

export async function trainModel(
  xData: Tensor | Tensor[],
  yData: Tensor | Tensor[],
  model: tf.LayersModel,
  options?: ModelFitArgs,
);
export async function trainModel(
  xData: Tensor | Tensor[],
  yData: Tensor | Tensor[],
  model: string,
  options?: ModelFitArgs,
);
export async function trainModel(
  xData: Tensor | Tensor[],
  yData: Tensor | Tensor[],
  modelOrName: string | tf.LayersModel = DEFAULT_MODEL_NAME,
  options: ModelFitArgs = { epochs: 100, shuffle: true },
) {
  const model =
    typeof modelOrName === 'string'
      ? await loadModel(modelOrName)
      : modelOrName;
  await model.fit(xData, yData, options);
  await saveModel(model);
}/**/
