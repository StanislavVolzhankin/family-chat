<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function refreshApplication(): void
    {
        parent::refreshApplication();
        $this->app['config']->set('database.connections.pgsql.database', 'family_chat_test');
    }
}
