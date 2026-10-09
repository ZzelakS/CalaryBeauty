import { httpAction } from './_generated/server'
import { api } from './_generated/api'

const AUTHORIZE_NET_URL =
    'https://api.authorize.net/xml/v1/request.api'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

function jsonResponse(
    body: Record<string, unknown>,
    status = 200,
) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
        },
    })
}

export const processPayment = httpAction(
    async (ctx, request) => {
        if (request.method !== 'POST') {
            return jsonResponse(
                {
                    ok: false,
                    message: 'Method not allowed.',
                },
                405,
            )
        }

        try {
            const body = await request.json()

            const items = body?.items
            const payment = body?.payment

            if (!Array.isArray(items) || items.length === 0) {
                return jsonResponse(
                    {
                        ok: false,
                        message: 'Your bag is empty.',
                    },
                    400,
                )
            }

            if (
                !payment ||
                typeof payment.dataDescriptor !== 'string' ||
                typeof payment.dataValue !== 'string' ||
                !payment.dataValue
            ) {
                return jsonResponse(
                    {
                        ok: false,
                        message: 'Invalid payment information.',
                    },
                    400,
                )
            }

            const apiLoginId =
                process.env.AUTHORIZENET_API_LOGIN_ID

            const transactionKey =
                process.env.AUTHORIZENET_TRANSACTION_KEY

            if (!apiLoginId || !transactionKey) {
                console.error(
                    '[Calary] Authorize.net credentials are not configured.',
                )

                return jsonResponse(
                    {
                        ok: false,
                        message:
                            'Payment service is not configured.',
                    },
                    500,
                )
            }

            const products = await ctx.runQuery(
                api.products.listPublic,
            )

            let total = 0

            const normalizedItems: Array<{
                productId: string
                quantity: number
                length?: string
            }> = []

            for (const item of items) {
                if (
                    !item ||
                    typeof item.productId !== 'string' ||
                    !Number.isInteger(item.quantity) ||
                    item.quantity < 1 ||
                    item.quantity > 99
                ) {
                    return jsonResponse(
                        {
                            ok: false,
                            message: 'Invalid cart information.',
                        },
                        400,
                    )
                }

                const product = products.find(
                    (candidate) => candidate.id === item.productId,
                )

                if (!product) {
                    return jsonResponse(
                        {
                            ok: false,
                            message:
                                'One of the products in your bag is no longer available.',
                        },
                        400,
                    )
                }

                if (
                    item.length !== undefined &&
                    item.length !== null &&
                    typeof item.length !== 'string'
                ) {
                    return jsonResponse(
                        {
                            ok: false,
                            message: 'Invalid product selection.',
                        },
                        400,
                    )
                }

                total += product.price * item.quantity

                normalizedItems.push({
                    productId: product.id,
                    quantity: item.quantity,
                    length: item.length,
                })
            }

            if (!Number.isFinite(total) || total <= 0) {
                return jsonResponse(
                    {
                        ok: false,
                        message: 'Invalid order total.',
                    },
                    400,
                )
            }

            const amount = total.toFixed(2)

            const authorizeRequest = {
                createTransactionRequest: {
                    merchantAuthentication: {
                        name: apiLoginId,
                        transactionKey,
                    },

                    transactionRequest: {
                        transactionType: 'authCaptureTransaction',
                        amount,

                        payment: {
                            opaqueData: {
                                dataDescriptor:
                                    payment.dataDescriptor,
                                dataValue: payment.dataValue,
                            },
                        },

                        order: {
                            invoiceNumber: `CALARY-${Date.now()}`,
                            description: 'Calary Beauty order',
                        },
                    },
                },
            }

            const gatewayResponse = await fetch(
                AUTHORIZE_NET_URL,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(authorizeRequest),
                },
            )

            const gatewayData =
                (await gatewayResponse.json()) as {
                    messages?: {
                        resultCode?: string
                        message?: Array<{
                            code?: string
                            text?: string
                        }>
                    }
                    transactionResponse?: {
                        responseCode?: string
                        transId?: string
                        authCode?: string
                        errors?: Array<{
                            errorCode?: string
                            errorText?: string
                        }>
                        messages?: Array<{
                            code?: string
                            description?: string
                        }>
                    }
                }

            const transactionResponse =
                gatewayData.transactionResponse

            const approved =
                gatewayData.messages?.resultCode === 'Ok' &&
                transactionResponse?.responseCode === '1' &&
                Boolean(transactionResponse.transId)

            console.error('[Calary] Authorize.net declined transaction', {
                resultCode: gatewayData.messages?.resultCode,
                responseCode: transactionResponse?.responseCode,
                transId: transactionResponse?.transId,
                errors: transactionResponse?.errors,
                messages: transactionResponse?.messages,
            })

            if (!approved) {
                const errorMessage =
                    transactionResponse?.errors?.[0]?.errorText ||
                    transactionResponse?.messages?.[0]?.description ||
                    gatewayData.messages?.message?.[0]?.text ||
                    'Your payment was declined.'

                return jsonResponse(
                    {
                        ok: false,
                        message: errorMessage,
                    },
                    400,
                )
            }

            console.info('[Calary] payment approved', {
                transactionId:
                    transactionResponse.transId,
                amount,
                items: normalizedItems,
            })

            return jsonResponse({
                ok: true,
                message: 'Payment successful.',
                transactionId:
                    transactionResponse.transId,
            })
        } catch (error) {
            console.error(
                '[Calary] Authorize.net payment error',
                error,
            )

            return jsonResponse(
                {
                    ok: false,
                    message:
                        'Unable to process your payment right now. Please try again.',
                },
                500,
            )
        }
    },
)