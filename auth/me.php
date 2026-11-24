<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/helpers.php';
init_api();

$user = current_user();
json_response([
    'authenticated' => $user !== null,
    'user' => $user,
]);
