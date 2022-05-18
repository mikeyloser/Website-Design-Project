#!/usr/bin/env python3

import socket
import os
import stat
from urllib.parse import unquote

from threading import Thread

# Equivalent to CRLF, named NEWLINE for clarity
NEWLINE = "\r\n"
OK = 'HTTP/1.1 200 OK{}Connection: close{}'.format(NEWLINE,NEWLINE)
NOT_FOUND = 'HTTP/1.1 404 NOT FOUND{}Connection: close{}{}'.format(NEWLINE,NEWLINE,NEWLINE)
FORBIDDEN = 'HTTP/1.1 403 FORBIDDEN{}Connection: close{}{}'.format(NEWLINE,NEWLINE,NEWLINE)
REDIRECT = 'HTTP/1.1 307 TEMPORARY REDIRECT{}Connection: close{}'.format(NEWLINE,NEWLINE)


# Let's define some functions to help us deal with files, since reading them
# and returning their data is going to be a very common operation.

def get_file_contents(file_name):
    """Returns the text content of `file_name`"""
    with open(file_name, "r") as f:
        return f.read()


def get_file_binary_contents(file_name):
    """Returns the binary content of `file_name`"""
    with open(file_name, "rb") as f:
        return f.read()


def has_permission_other(file_name):
    """Returns `True` if the `file_name` has read permission on other group

    In Unix based architectures, permissions are divided into three groups:

    1. Owner
    2. Group
    3. Other

    When someone requests a file, we want to verify that we've allowed
    non-owners (and non group) people to read it before sending the data over.
    """
    stmode = os.stat(file_name).st_mode
    return getattr(stat, "S_IROTH") & stmode > 0


# Some files should be read in plain text, whereas others should be read
# as binary. To maintain a mapping from file types to their expected form, we
# have a `set` that maintains membership of file extensions expected in binary.
# We've defined a starting point for this set, which you may add to as
# necessary.
# TODO: Finish this set with all relevant files types that should be read in
# binary
binary_type_files = set(["jpg", "jpeg", "png", "mp3", "ico"])


def should_return_binary(file_extension):
    """
    Returns `True` if the file with `file_extension` should be sent back as
    binary.
    """
    return file_extension in binary_type_files


# For a client to know what sort of file you're returning, it must have what's
# called a MIME type. We will maintain a `dictionary` mapping file extensions
# to their MIME type so that we may easily access the correct type when
# responding to requests.
# TODO: Finish this dictionary with all required MIME types
mime_types = {
    "html": "text/html",
    "css": "text/css",
    "js": "text/javascript",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "mp3": "audio/mpeg",
    "ico": "image/vnd.microsoft.icon"
}


def get_file_mime_type(file_extension):
    """
    Returns the MIME type for `file_extension` if present, otherwise
    returns the MIME type for plain text.
    """
    mime_type = mime_types[file_extension]
    return mime_type if mime_type is not None else "text/plain"


class HTTPServer:
    """
    Our actual HTTP server which will service GET and POST requests.
    """

    def __init__(self, host="localhost", port=9001, directory="."):
        print(f"Server started. Listening at http://{host}:{port}/")
        self.host = host
        self.port = port
        self.working_dir = directory

        self.setup_socket()
        self.accept()

        self.teardown_socket()

    def setup_socket(self):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.bind((self.host, self.port))
        self.sock.listen(128)

    def teardown_socket(self):
        if self.sock is not None:
            self.sock.shutdown()
            self.sock.close()

    def accept(self):
        while True:
            (client, address) = self.sock.accept()
            th = Thread(target=self.accept_request, args=(client, address))
            th.start()

    def accept_request(self, client_sock, client_addr):
        data = client_sock.recv(4096)
        req = data.decode("utf-8")

        response = self.process_response(req)
        client_sock.send(response)

        # clean up
        client_sock.shutdown(1)
        client_sock.close()

    def process_response(self, request):
        formatted_data = request.strip().split(NEWLINE)
        request_words = formatted_data[0].split()

        if len(request_words) == 0:
            return

        requested_file = request_words[1][1:]
        # Add HEAD Request Response - not required for HW4
        if request_words[0] == "HEAD":
            return self.head_request(requested_file, formatted_data)        
        if request_words[0] == "GET":
            return self.get_request(requested_file, formatted_data)
        if request_words[0] == "POST":
            return self.post_request(requested_file, formatted_data)
        return self.method_not_allowed()
    
    # Method to respond to head request
    def head_request(self, requested_file, data): 
        if not os.path.exists(requested_file):
            response = NOT_FOUND
        elif not has_permission_other(requested_file):
            response = FORBIDDEN
        else:
            response = OK
            
        return response.encode('utf-8')
            

    # TODO: Write the response to a GET request
    def get_request(self, requested_file, data):
        """
        Responds to a GET request with the associated bytes.

        If the request is to a file that does not exist, returns
        a `NOT FOUND` error.

        If the request is to a file that does not have the `other`
        read permission, returns a `FORBIDDEN` error.

        Otherwise, we must read the requested file's content, either
        in binary or text depending on `should_return_binary` and
        send it back with a status set and appropriate mime type
        depending on `get_file_mime_type`.
        """
        if ('redirect' in requested_file):
            header = REDIRECT
            query = requested_file.split('=')
            yt = 'https://www.youtube.com/results?search_query=' + query[1]
            header += 'Location: ' + yt + NEWLINE + NEWLINE
            return header.encode('utf-8')
        if (not os.path.exists(requested_file)):
            return self.resource_not_found()
        elif (not has_permission_other(requested_file)):
            return self.resource_forbidden()
        else:
            header = OK
            ext = requested_file.split('.')
            mime = get_file_mime_type(ext[1])
            if (should_return_binary(ext[1])):
                r = get_file_binary_contents(requested_file)
                result = header + 'Content-Length: ' + str(len(r)) + NEWLINE + 'Content-Type: ' + mime + NEWLINE + NEWLINE
                result = result.encode('utf-8')
                result += r
            else:
                r = get_file_contents(requested_file)
                result = header + 'Content-Length: ' + str(len(r)) + NEWLINE + 'Content-Type: ' + mime + NEWLINE + NEWLINE + get_file_contents(requested_file)
                result = result.encode('utf-8')
            return result
        
            
    # TODO: Write the response to a POST request
    def post_request(self, requested_file, data):
        """
        Responds to a POST request with an HTML page with keys and values
        echoed per the requirements writeup.

        A post request through the form will send over key value pairs
        through "x-www-form-urlencoded" format. You may learn more about
        that here:
          https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/POST
        You /do not/ need to check the POST request's Content-Type to
        verify the encoding used (although a real server would).

        From the request, each key and value should be extracted. A row in
        the HTML table will hold a single key-value pair. With the key having
        the first column and the value the second. If a request sent n
        key-value pairs, the HTML page returned should contain a table like:

        | key 1 | val 1 |
        | key 2 | val 2 |
        | ...   | ...   |
        | key n | val n |

        Care should be taken in forming values with spaces. Since the request
        was urlencoded, it will need to be decoded using
        `urllib.parse.unquote`.
        """
        req = unquote(data[-1])
        req = req.split('&')
        keys = []
        values = []
        for i in req:
            i = i.split('=')
            keys.append(i[0])
            values.append(i[1])
        html = '<!DOCTYPE html> <html> <head> <link rel="stylesheet" href="style.css"> <script type="text/javascript" src="myScript.js"> </script> </head> <body onload="colorRows()"> <table id="contacts">'

        i = 0
        while (i < len(keys)):
            html += '<tr><td>' + keys[i] + '</td><td>' + values[i] + '</td></tr>'
            i += 1
        html += '</table> </body> </html>'
        response = OK + NEWLINE + html
        return response.encode('utf-8')

    def method_not_allowed(self):
        """
        Returns 405 not allowed status and gives allowed methods.

        TODO: If you are not going to complete the `ResponseBuilder`,
        This must be rewritten.
        """
        NOT_ALLOWED = 'HTTP/1.1 405 METHOD NOT ALLOWED{}Allow: GET, POST{}Connection: keep-alive{}{}'.format(NEWLINE,NEWLINE,NEWLINE,NEWLINE)
        return NOW_ALLOWED.encode('utf-8')

    # TODO: Make a function that handles not found error
    def resource_not_found(self):
        """
        Returns 404 not found status and sends back our 404.html page.
        """
        response = NOT_FOUND
        response = response + get_file_contents('404.html')
        return response.encode('utf-8')


    # TODO: Make a function that handles forbidden error
    def resource_forbidden(self):
        """
        Returns 403 FORBIDDEN status and sends back our 403.html page.
        """
        response = FORBIDDEN
        response = response + get_file_contents('403.html')
        return response.encode('utf-8')


class ResponseBuilder:
    """
    This class is here for your use if you want to use it. This follows
    the builder design pattern to assist you in forming a response. An
    example of its use is in the `method_not_allowed` function.

    Its use is optional, but it is likely to help, and completing and using
    this function to build your responses will give 5 bonus points.
    """

    def __init__(self):
        """
        Initialize the parts of a response to nothing.
        """
        self.headers = []
        self.status = None
        self.content = None

    def add_header(self, headerKey, headerValue):
        """ Adds a new header to the response """
        self.headers.append(f"{headerKey}: {headerValue}")

    def set_status(self, statusCode, statusMessage):
        """ Sets the status of the response """
        self.status = f"HTTP/1.1 {statusCode} {statusMessage}"

    def set_content(self, content):
        """ Sets `self.content` to the bytes of the content """
        if isinstance(content, (bytes, bytearray)):
            self.content = content
        else:
            self.content = content.encode("utf-8")

    # TODO Complete the build function
    def build(self):
        """
        Returns the utf-8 bytes of the response.

        Uses the `self.status`, `self.headers` and `self.content` to form
        an HTTP response in valid formatting per w3c specifications, which
        can be seen here:
          https://www.w3.org/Protocols/rfc2616/rfc2616-sec6.html
        or here:
          https://www.tutorialspoint.com/http/http_responses.htm

        Where CRLF is our `NEWLINE` constant.
        """
        pass


if __name__ == "__main__":
    HTTPServer()
