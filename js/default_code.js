export const DEFAULT_SOURCE = "\
#include <iostream>\n\
using namespace std;\n\
\n\
int main() {\n\
    // Print numbers from 1 to 10\n\
    for(int i = 1; i <= 10; i++) {\n\
        cout << i << '\\n';\n\
    }\n\
    return 0;\n\
}\n\
";

export const DEFAULT_STDIN = ""; // No input needed for this program

export const DEFAULT_STDOUT = "1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n"; // Expected output 