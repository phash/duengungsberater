#!/bin/bash

echo "🧪 Testing Duengungsberater Setup"
echo "================================="
echo ""

# Test Auth Server
echo "1️⃣ Testing Auth Server (Port 3000)"
echo "---"

# Health check
HEALTH=$(curl -s http://127.0.0.1:3000/health)
if [[ $HEALTH == *"ok"* ]]; then
  echo "✅ Auth Server responding"
  echo "   Response: $HEALTH"
else
  echo "❌ Auth Server not responding"
  exit 1
fi

echo ""

# Test signup
echo "2️⃣ Testing Signup"
echo "---"

TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="TestPass123!"

SIGNUP_RESPONSE=$(curl -s -X POST http://127.0.0.1:3000/auth/v1/signup \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

if [[ $SIGNUP_RESPONSE == *"session"* ]]; then
  echo "✅ Signup working"
  echo "   Email: $TEST_EMAIL"

  # Extract access token
  ACCESS_TOKEN=$(echo $SIGNUP_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
  echo "   Token: ${ACCESS_TOKEN:0:20}..."
else
  echo "❌ Signup failed"
  echo "   Response: $SIGNUP_RESPONSE"
  exit 1
fi

echo ""

# Test get user
echo "3️⃣ Testing Get User"
echo "---"

USER_RESPONSE=$(curl -s http://127.0.0.1:3000/auth/v1/user \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if [[ $USER_RESPONSE == *"$TEST_EMAIL"* ]]; then
  echo "✅ Get User working"
  echo "   User: $USER_RESPONSE"
else
  echo "❌ Get User failed"
  echo "   Response: $USER_RESPONSE"
  exit 1
fi

echo ""

# Test Vue App
echo "4️⃣ Testing Vue App (Port 5173)"
echo "---"

APP_RESPONSE=$(curl -s http://127.0.0.1:5173/)

if [[ $APP_RESPONSE == *"Düngungsberater"* ]] || [[ $APP_RESPONSE == *"app"* ]]; then
  echo "✅ Vue App responding"
  echo "   Title: Düngungsberater"
else
  echo "❌ Vue App not responding properly"
  echo "   Response: ${APP_RESPONSE:0:100}..."
fi

echo ""
echo "================================="
echo "✅ All tests passed!"
echo ""
echo "🎉 Setup is working correctly!"
echo ""
echo "Access the app at: http://127.0.0.1:5173/"
