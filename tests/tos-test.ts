import 'dotenv/config';

// 导入 SDK, 当 TOS Node.JS SDK 版本小于 2.5.2 请把下方 TosClient 改成 TOS 导入
import { bucketName, client } from '@/lib/tos';
import { TosClient, TosClientError, TosServerError } from '@volcengine/tos-sdk';

import 'dotenv/config'


function handleError(error: any) {
    if (error instanceof TosClientError) {
        console.log('Client Err Msg:', error.message);
        console.log('Client Err Stack:', error.stack);
    } else if (error instanceof TosServerError) {
        console.log('Request ID:', error.requestId);
        console.log('Response Status Code:', error.statusCode);
        console.log('Response Header:', error.headers);
        console.log('Response Err Code:', error.code);
        console.log('Response Err Msg:', error.message);
    } else {
        console.log('unexpected exception, message: ', error);
    }
}

async function upload() {
    try {
        const url = "https://ark-content-generation-v2-cn-beijing.tos-cn-beijing.volces.com/doubao-seedream-4-0/021759411409176860cde38290461f4b74ab5abe39cd41dd8a4dd_0.jpeg?X-Tos-Algorithm=TOS4-HMAC-SHA256&X-Tos-Credential=AKLTYWJkZTExNjA1ZDUyNDc3YzhjNTM5OGIyNjBhNDcyOTQ%2F20251002%2Fcn-beijing%2Ftos%2Frequest&X-Tos-Date=20251002T132334Z&X-Tos-Expires=86400&X-Tos-Signature=edbe978379d069d968e6c489f6247941f08c265e46cf05260be4c21d4925e36a&X-Tos-SignedHeaders=host"
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const objectName = 'doubao-seedream-4-0/021759411409176860cde38290461f4b74ab5abe39cd41dd8a4dd_0.jpeg';
        // 上传对象
        await client.putObject({
            bucket: bucketName,
            key: objectName,
            body: Buffer.from(buffer),
        });

        // 查询刚刚上传对象的大小
        const { data } = await client.headObject({
            bucket: bucketName,
            key: objectName,
        });
        // object size: 11
        console.log('object size:', data['content-length']);
    } catch (error) {
        handleError(error);
    }
}


async function download() {
  try {
    const objectName = 'doubao-seedream-4-0/021759411409176860cde38290461f4b74ab5abe39cd41dd8a4dd_0.jpeg'
    // 获取签名后的URL，有效期24小时（86400秒）
    client.getObjectToFile
    const url = client.getPreSignedUrl({
      bucket: bucketName,
      key: objectName,
      expires: 86400 * 1,
      query:{
        'x-tos-process': 'image/format,webp' //压缩
      }
    })
    console.log('签名URL:', url)
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    console.log('buffer:', buffer)
  } catch (error) {
    handleError(error)
  }
}

download()