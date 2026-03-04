<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],
    'gemini' => [
        'key'   => env('GEMINI_API_KEY'),
        'model' => env('GEMINI_MODEL', 'gemini-1.5-flash-latest'),
    ],
     'huggingface' => [
        'token' => env('HF_API_TOKEN'),
        'model' => env('HF_API_MODEL', 'nateraw/vit-base-patch16-224-places365'),
    ],
    'paymee' => [
        'api_key'  => env('PAYMEE_API_KEY'),
        'base_url' => env('PAYMEE_BASE_URL', 'https://sandbox.paymee.tn/api/v2'),
    ],
    'paypal' => [
    'client_id' => env('PAYPAL_CLIENT_ID'),
    'secret'    => env('PAYPAL_SECRET'),
    'base_url'  => env('PAYPAL_BASE_URL'),
    ],

    'braintree' => [
    'merchant_id' => env('BRAINTREE_MERCHANT_ID'),
    'public_key' => env('BRAINTREE_PUBLIC_KEY'),
    'private_key' => env('BRAINTREE_PRIVATE_KEY'),
    'environment' => env('BRAINTREE_ENVIRONMENT'),
    ],

];
