from anthropic import Anthropic

client = Anthropic()


def call_messages():
    response = client.messages.create(
        model='claude-opus-4-7',
        system='You are a helpful assistant.',
        messages=[{'role': 'user', 'content': 'Hello there.'}],
    )
    return response
