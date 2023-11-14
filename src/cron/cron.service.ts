import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { UserService } from '../models/user/user.service';
/*import { initModel, loadModel, trainModel } from '../my-ai/MyAi';
import * as tf from '@tensorflow/tfjs-node';/**/

export enum CronServiceName {
  TRAIN_MODEL = 'trainModel',
}

@Injectable()
export class CronService {
  constructor(
    private schedulerRegistry: SchedulerRegistry,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}

  /*@Cron(CronExpression.EVERY_5_SECONDS, { name: CronServiceName.TRAIN_MODEL })
  private async trainModel() {
    let model: tf.LayersModel;
    try {
      console.log('load model');
      model = await loadModel();
    } catch (e) {
      console.log(e);
      console.log('init model instead');
      model = initModel();
    }

    console.log('generate training data');
    const BATCH_COUNT = 3;
    const BATCH_SIZE = 27;
    const inputTrainingValues = new Array(BATCH_COUNT)
      .fill(0)
      .map((_, i1) =>
        new Array(BATCH_SIZE).fill(0).map((_, i) => (i1 + 1) * i),
      );
    const outputTrainingValues = new Array(BATCH_COUNT)
      .fill(0)
      .map((_, i1) =>
        new Array(BATCH_SIZE).fill(0).map((_, i) => (i1 + 1) * i + 5),
      );
    console.log('training data', inputTrainingValues);

    // Generate some synthetic data for training.
    const xs = tf.tensor2d(inputTrainingValues, [BATCH_COUNT, BATCH_SIZE]);
    const ys = tf.tensor2d(outputTrainingValues, [BATCH_COUNT, BATCH_SIZE]);

    // const options: {
    //   vocabSize: number;
    //   embeddingDim: number;
    //   rnnUnits: number;
    // } = {
    //   vocabSize: 25,
    //   embeddingDim: 10,
    //   rnnUnits: 10,
    // };
    // const layers = [
    //   tf.layers.embedding({
    //     inputDim: options.vocabSize,
    //     outputDim: options.embeddingDim,
    //     inputLength: BATCH_SIZE,
    //   }),
    //   // tf.layers.bidirectional({
    //   //   layer: tf.layers.lstm({
    //   //     units: options.rnnUnits,
    //   //     activation: 'relu',
    //   //   }),
    //   // }),
    //   tf.layers.gru({ units: options.rnnUnits, returnSequences: true }),
    //   // tf.layers.reshape({
    //   //   targetShape: [options.rnnUnits, options.embeddingDim],
    //   // }),
    //   tf.layers.conv1d({
    //     filters: 20,
    //     kernelSize: 5,
    //   }),
    //   // tf.layers.dense({ units: 1, activation: 'linear' }),
    // ];
    //
    // let value: any = xs;
    // layers.forEach((layer, index) => {
    //   value = layer.apply(value);
    //   console.log('outcome', index, value);
    // });

    console.log('train model');
    await trainModel(xs, ys, model, {
      epochs: 100,
      batchSize: BATCH_SIZE,
      shuffle: true,
    });

    console.log('predict');
    const result = model.predict(tf.tensor2d([[1, 1]]));
    console.log(
      'result',
      result,
      Array.isArray(result)
        ? result.map((tensor) => tensor.dataSync())
        : result.dataSync(),
    );
  }/**/
}
