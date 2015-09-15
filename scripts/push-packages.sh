#!/bin/bash
#
# Script used to push .rpm and .deb packages up to `packagecloud.io`.
#
# The new package replaces the existing one in the packagecloud repo.
#

build_dir="./build"

rpm_pkg=`ls ${build_dir} | grep x86_64.rpm`
deb_pkg=`ls ${build_dir} | grep amd64.deb`

rpm_repo="vindalu/vindalu/el/6"
deb_repo="vindalu/vindalu/ubuntu/trusty"

RETVAL=0

push_package() {
    repo=$1
    pkg=$2

    package_cloud push ${repo} "${build_dir}/${pkg}" || {
        echo "Removing existing package..."
        package_cloud yank ${repo} ${pkg}
        echo "Existing package removed!"
        
        echo "Pushing new package: ${pkg}"
        package_cloud push ${repo} "${build_dir}/${pkg}"
        
        RETVAL=$?
        [ $RETVAL -ne 0 ] && {
            echo "[ failed ]"
            return
        }
    }
    echo "** SUCCESS pushing: ${pkg}! (Previous push errors can be ignored.)"
}

main() {

    if [ "${rpm_pkg}" != "" ]; then 
        push_package $rpm_repo "${rpm_pkg}"
    else
        echo "No .RPM's found!"
    fi

    if [ "${deb_pkg}" != "" ]; then 
        push_package $deb_repo "${deb_pkg}"
    else
        echo "No .DEB's found!"
    fi
}

main

exit $RETVAL