## Coding Plan

Use this if you have a [Z.ai GLM Coding Plan](https://z.ai/manage-apikey/subscription) subscription. All requests go to `api.z.ai/api/coding/paas/v4`. The `region` setting is ignored in this mode.

Set `glm-copilot.apiMode` to **Coding Plan** in settings.

## Standard API

Pay-as-you-go access via the GLM Open Platform. The endpoint depends on your region:

- **International** (`z.ai`) — get your key at [z.ai/manage-apikey/apikey-list](https://z.ai/manage-apikey/apikey-list)
- **Mainland China** (`bigmodel.cn`) — get your key at [open.bigmodel.cn](https://open.bigmodel.cn/usercenter/proj-mgmt/apikeys)

Set `glm-copilot.apiMode` to **Standard API** and pick the matching `glm-copilot.region`.

## Custom endpoint

Set `glm-copilot.baseUrl` to override the endpoint entirely. Both `apiMode` and `region` are ignored when a base URL is set. Use this for self-hosted proxies or compatible APIs.

Open settings to configure these options.
